import { RenderPipeLine } from "./drawables/Drawable";
import type { TerraScene } from "./TerraScene";
import { Light } from "./lights";
import { TerraNode } from "./TerraNode";




export class GPUScene {
    #bufferSizes: WeakMap<GPUBuffer, number> = new WeakMap();
    #bufferIndexFormats: WeakMap<GPUBuffer, GPUIndexFormat> = new WeakMap();
    sampleCount: number = 4;


    NodeInstances: Map<TerraNode, number> = new Map();

    GPUBindGroupLayouts: WeakMap<GPUBindGroup, GPUBindGroupLayout> = new WeakMap();

    #uniformBindGroupLayoutWithTime = this.createBindGroupLayout(
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            type: 'uniform-buffer'
        },
        {
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            type: 'uniform-buffer'
        }
    );
    
    //viewprojection and camera position
    uniformBuffer = this.createGPUBuffer(4 * 16 * 2 + 3 * 4, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]); //Todo: set to private

    singleWritableStorageLayout = this.device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                type: "storage-buffer"
            }]
    })
    singleVertexUniformLayout = this.createBindGroupLayout(
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            type: 'uniform-buffer'
        })


    #uniformBindGroupLayout = this.singleVertexUniformLayout;
    #uniformBindGroupNoTime = this.createBindGroup(
        this.#uniformBindGroupLayout,
        {
            binding: 0,
            resource: {
                buffer: this.uniformBuffer
            }
        }
    );

    baseBindGroup: BindGroupDrawable;

    baseBindGroupNoTime = this.addBindGroup(this.#uniformBindGroupNoTime);


    shaderModules: Map<string, GPUShaderModule> = new Map();

    GPUData = this.createGPUBuffer(TerraNode.alignment * TerraNode.maxInstances, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE]);

    BindGroupLayout = this.createBindGroupLayout({ binding: 0, visibility: GPUShaderStage.VERTEX, type: "uniform-buffer", hasDynamicOffset: true });
    BindGroup = this.createBindGroup(this.BindGroupLayout,
        {
            binding: 0,
            resource: {
                buffer: this.GPUData,
                offset: 0,
                size: TerraNode.GPUDataSize
            }
        });

    positionBindGroupTime;
    positionBindGroupNoTime = this.baseBindGroupNoTime.addChildBindGroup(this.BindGroup, true);
    lights: Light;
    positionBindGroupLightsTime: DynamicBindGroupDrawable<[number]>;
    canvas: HTMLCanvasElement;
    swapAttachment: GPUTextureView;
    depthAttachment: GPUTextureView;


    addBindGroup<T>(bindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), properties?:T) {
        const bglayout = this.GPUBindGroupLayouts.get(bindgroup);
        if (!bglayout)
            throw ('Bindgroup layout not found from weakmap');
        return new BindGroupDrawable(this, bglayout, undefined, bindgroup);
    }

    createBindGroupLayout<T extends GPUBindGroupLayoutEntry>(entry: T): BindGroupLayoutOneBinding<T>
    createBindGroupLayout<T extends [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>(...entries: T): BindGroupLayoutTwoBinding<T>
    createBindGroupLayout<T extends [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>(...entries: T): BindGroupLayoutThreeBinding<T>
    createBindGroupLayout<T extends GPUBindGroupLayoutEntry[]>(...entries: T): TerraBindGroupLayout<T> {
        const layout = this.device.createBindGroupLayout({ entries }) as TerraBindGroupLayout<T>;
        layout.createBindGroup = (...entries: GPUBindGroupEntry[]) => {
            const bindGroup = this.device.createBindGroup({ layout, entries });
            this.GPUBindGroupLayouts.set(bindGroup, layout);
            return bindGroup
        }
        return this.device.createBindGroupLayout({ entries }) as TerraBindGroupLayout<T>;
    }

    createBindGroup<T extends GPUBindGroupLayout, U extends bindings<T>>(layout: T, ...entries: U): getBindType<T>
    createBindGroup(layout: GPUBindGroupLayout, ...entries: GPUBindGroupEntry[]): GPUBindGroup {
        const bindGroup = this.device.createBindGroup({ layout, entries });
        this.GPUBindGroupLayouts.set(bindGroup, layout);
        return bindGroup
    }
    #uniformBufferSwap = this.createGPUBuffer(4 * 16 * 2 + 3 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);

    static instance: GPUScene;

    
    


    queue: Map<Float32Array, number> = new Map();
    #busy = false;
    updateGPUBuffer(): GPUCommandBuffer | null {
        if (this.queue.size === 0 || this.#busy)
            return null;
        this.#busy = true;
        const dataSize = TerraNode.GPUDataSize; //4 * 16 + 3 * 4;
        const tempSize = dataSize * this.queue.size;
        const tempBuffer = this.createGPUBuffer(tempSize, [GPUBufferUsage.COPY_SRC], true);
        let tempOffset = 0;
        const commandEncoder = this.device.createCommandEncoder();
        this.queue.forEach((bufferOffset, matrix) => {
            new Float32Array(tempBuffer.getMappedRange(tempOffset * dataSize, dataSize)).set(matrix);
            commandEncoder.copyBufferToBuffer(
                tempBuffer, tempOffset++ * dataSize,
                this.GPUData, bufferOffset,
                dataSize);
            //new Float32Array(this.worldCopyGPU.getMappedRange(bufferOffset, 4 * 16)).set(matrix);
        });
        tempBuffer.unmap();
        /* this.scene.GPU2CPU(async (arr) => {
             await arr.mapAsync(GPUMapMode.READ, 0, tempSize);
             const arrbuff = arr.getMappedRange(0, tempSize);
             console.log(new Float32Array(arrbuff));
             //debugger;
         }, tempBuffer);*/
        this.queue.clear();
        // this.worldCopyGPU.unmap();

        this.#busy = false;
        return commandEncoder.finish();
    }
    swapChain = this.scene.context.configureSwapChain({
        device: this.device,
        format: "bgra8unorm"
    });
    createSwapTextures() {
        const size = {
            width: this.scene.canvasSize.width,
            height: this.scene.canvasSize.height,
            depth: 1,
        }
        let swapTexture = this.device.createTexture({
            size,
            sampleCount: this.sampleCount,
            format: "bgra8unorm",
            usage: GPUTextureUsage.OUTPUT_ATTACHMENT,
        });
        let depthTexture = this.device.createTexture({
            size,
            sampleCount: this.sampleCount,
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.OUTPUT_ATTACHMENT
        });
        return [swapTexture.createView(), depthTexture.createView()];
    }
    constructor(private scene: TerraScene, public device: GPUDevice) {
        
        [this.swapAttachment, this.depthAttachment] = this.createSwapTextures();
        let resizeHandler = 0;
        window.addEventListener('resize', () => {
            clearTimeout(resizeHandler);
            resizeHandler = setTimeout(() => {
                scene.canvasSize.width = scene.canvas.getAttribute('width')! as any | 0;
                scene.canvasSize.height = scene.canvas.getAttribute('height')! as any | 0;
                [this.swapAttachment, this.depthAttachment] = this.createSwapTextures();
            },500)
        });
        this.canvas=scene.canvas
        const timeAndDeltaBuffer = new ArrayBuffer(12);
        const timeBuffer = this.createGPUBuffer(timeAndDeltaBuffer.byteLength, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]);
        const uniformBindGroup = this.createBindGroup(
                this.#uniformBindGroupLayoutWithTime,
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer
                    }
                }, {
                binding: 1,
                resource: {
                    buffer: timeBuffer
                }
            });
        this.baseBindGroup = this.addBindGroup(uniformBindGroup, { animate1: false });
        this.positionBindGroupTime = this.baseBindGroup.addChildBindGroup(this.BindGroup, true);
        this.lights = new Light(this);
        const timeView = new Uint32Array(timeAndDeltaBuffer, 0, 1);
        const deltaView = new Float32Array(timeAndDeltaBuffer, 4, 1);
        const animationView = new Float32Array(timeAndDeltaBuffer, 8, 1);
        const timeBufferStorage = this.createGPUBuffer(timeAndDeltaBuffer.byteLength, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);
        this.positionBindGroupTime.onRender = async (time) => {
            return this.updateGPUBuffer();
        }
        this.positionBindGroupLightsTime = this.lights.lightsBindGroup.addChildBindGroup(this.BindGroup, true);
        this.positionBindGroupLightsTime.onRender = async (time) => {
            return this.updateGPUBuffer();
        }
        this.positionBindGroupNoTime.onRender = async (time) => {
            return this.updateGPUBuffer();
        }
        const me = this;
        this.baseBindGroup.onRender = function (time, delta) {

           // windIntensivy = Math.min(Math.max(windIntensivy+0.000625-(Math.random()*0.00125),-1),1)
            timeView.set([time]);
            if (me.properties & 1) {
               // console.log('set animation', Math.cos(time * 0.0001) * Math.PI * 2)
               // animationView.set([Math.cos(time * 0.0001) * Math.PI * 2]);
                animationView.set([Math.cos(time * 0.001)]);
                //animationView.set([time * 0.001]);
              //  animationView.set([windIntensivy]);
            }
            if (delta !== null)
                deltaView.set([delta]);
            return me.updateBufferRaw(timeBufferStorage, timeBuffer, timeAndDeltaBuffer);

        }
        GPUScene.instance = this;
    }
    async updateBufferRaw(buffer: GPUMapWriteBuffer, destination: GPUCopyDSTBuffer, data: ArrayBuffer): Promise<GPUCommandBuffer | null> {
        if (this.#syncedBuffers.has(buffer))
            return null;
        this.#syncedBuffers.add(buffer);
        await buffer.mapAsync(GPUMapMode.WRITE, 0, data.byteLength);
        new Int8Array(buffer.getMappedRange(0, data.byteLength)).set(new Int8Array(data));
        return this.copyBufferToBuffer(buffer, destination, data.byteLength)
    }
    async updateBuffer(buffer: GPUMapWriteBuffer, destination: GPUCopyDSTBuffer, ...data: (Float32Array | Uint32Array)[]): Promise<GPUCommandBuffer | null> {
        if (this.#syncedBuffers.has(buffer))
            return null;
        const size = data.reduce((prev, curr) => prev + curr.byteLength, 0);
        this.#syncedBuffers.add(buffer);
        await buffer.mapAsync(GPUMapMode.WRITE, 0, size);
        let offset = 0;
        data.forEach(view => {
            new Int8Array(buffer.getMappedRange(offset, view.byteLength)).set(new Int8Array(view.buffer, 0, view.byteLength));
            offset += view.byteLength;
        });
        return this.copyBufferToBuffer(buffer, destination, size)
    }
    copyBufferToBuffer(buffer: GPUMapWriteBuffer, destination: GPUCopyDSTBuffer, size: number): GPUCommandBuffer {
        buffer.unmap();
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            buffer, 0,
            destination, 0,
            size);
        this.#syncedBuffers.delete(buffer);
        return commandEncoder.finish();
    }
    async updateView() {
        const encoder = await this.updateBufferRaw(this.#uniformBufferSwap, this.uniformBuffer, this.scene.viewProjectionPositionBuffer);
       // const encoder = await this.updateBuffer(this.#uniformBufferSwap, this.uniformBuffer, viewProjection, view, cameraPosition);
        if (encoder)
            this.device.defaultQueue.submit([encoder]);
    }



    #syncedBuffers: WeakSet<GPUMapWriteBuffer | GPUMapReadBuffer> = new WeakSet()
    //uniform
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUUniformBuffer & GPUCopyDSTBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUUniformBuffer & GPUCopyDSTBuffer & GPUStorageBuffer
    //index
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX], mappedAtCreation?: boolean): GPUIndexBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUIndexBuffer & GPUStorageBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUIndexBuffer & GPUStorageBuffer & GPUCopySRCBuffer
    //vertex
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.VERTEX], mappedAtCreation?: boolean): GPUVertexBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUVertexBuffer & GPUStorageBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUVertexBuffer & GPUCopyDSTBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUVertexBuffer & GPUCopyDSTBuffer & GPUStorageBuffer

    //storage 
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUStorageBuffer //(can be mapped at creation)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUStorageBuffer & GPUCopySRCBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUStorageBuffer & GPUCopyDSTBuffer

    //MAP read (Only CopyDst is allowed with MapRead)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUMapReadBuffer & GPUCopyDSTBuffer

    //MAP write (Only CopySrc is allowed with MapWrite)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.MAP_WRITE, typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.MAP_WRITE], mappedAtCreation?: boolean): GPUMapWriteBuffer & GPUCopySRCBuffer
    //copy source for mapped at creation
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUCopySRCBuffer


    createGPUBuffer(size: number, usages: number[], mappedAtCreation: boolean = false, GPUIndexFormat?: GPUIndexFormat): GPUBuffer {
        if (size === 0)
            throw (new Error('Cannot create zero sized buffer'));
        const usage = usages.reduce((prev, curr) => prev | curr, 0);
        const buff = this.device.createBuffer({ usage, size, mappedAtCreation });

        if (usage & GPUBufferUsage.MAP_READ) {
            (buff as GPUMapReadBuffer).readAndDestroy = (callback: (buff: ArrayBuffer) => Promise<void>): Promise<void> => {
                return buff.mapAsync(GPUMapMode.READ).then(() => {
                    const arrbuff = buff.getMappedRange();
                    callback(arrbuff).finally(() => buff.destroy())
                });
            }
        }
        else if (usage & GPUBufferUsage.COPY_SRC)
            this.#bufferSizes.set(buff, size);

        if (usage & GPUBufferUsage.INDEX) {
            this.#bufferIndexFormats.set(buff, GPUIndexFormat!);
        }

        return buff;
    }
    createCopy(commandEncoder: GPUCommandEncoder, ...buffers: GPUCopySRCBuffer[]): (GPUMapReadBuffer & GPUCopyDSTBuffer)[] {
        const readBuffers: (GPUMapReadBuffer & GPUCopyDSTBuffer)[] = [];
        buffers.forEach(buffer => {
            let size: number | undefined;
            if (size = this.#bufferSizes.get(buffer)) {
                const gpuReadBuffer = this.createGPUBuffer(size, [GPUBufferUsage.COPY_DST, GPUBufferUsage.MAP_READ])
                readBuffers.push(gpuReadBuffer);
                commandEncoder.copyBufferToBuffer(
                    buffer, // source buffer
                    0, //source offset
                    gpuReadBuffer, //destination buffer
                    0, //destination offset
                    size
                );
            }
            else
                throw (new Error('Buffer size not found from weakmap'));
        });
        return readBuffers;
    }

    createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): TerraGPUCommandEncoder {
        const commandEncoder = this.device.createCommandEncoder(descriptor) as TerraGPUCommandEncoder;
        /*   commandEncoder.finishWithCopy = (callback: (...buff: GPUBuffer[]) => Promise<void>, ...buffers: GPUCopySRCBuffer[]) => {
               this.createCopyBuffers(commandEncoder, buffers, callback);
           }*/
        return commandEncoder;
    }
    GPU2CPU(callback: (...buff: (GPUMapReadBuffer & GPUCopyDSTBuffer)[]) => Promise<void>, ...buffers: GPUCopySRCBuffer[]): void {
        const commandEncoder = this.device.createCommandEncoder();
        const readBuffers = this.createCopy(commandEncoder, ...buffers);
        this.device.defaultQueue.submit([commandEncoder.finish()]);
        callback(...readBuffers).finally(() => readBuffers.forEach(gpuReadBuffer => gpuReadBuffer.destroy()));
    }
    createComputePipeline(shader: string, layout?: GPUPipelineLayout, entryPoint = 'main'): TerraGPUComputePipeLine {
        const shaderModule = this.shaderModules.get(shader);
        if (!shaderModule)
            throw (new Error('Shader ' + shader + ' not found'));
        const desc: GPUComputePipelineDescriptor = {
            computeStage: {
                module: shaderModule,
                entryPoint
            }
        };
        if (layout)
            desc.layout = layout;
        const pipeline = this.device.createComputePipeline(desc) as TerraGPUComputePipeLine;
        pipeline.createBindGroup = (layout: number | GPUBindGroupLayout, entries) => this.device.createBindGroup({
            layout: layout instanceof GPUBindGroupLayout ? layout : pipeline.getBindGroupLayout(layout),
            entries: entries
        });
        return pipeline
    }
    properties = 0
    onRenders: ((time: DOMHighResTimeStamp, timeDelta: number | null) => Promise<GPUCommandBuffer | null>)[] = [];
    render(renderPass: GPURenderPassEncoder, time: DOMHighResTimeStamp) {
        let physicDelta: number | null;
        if (this.scene.physics.gameSpeed == -1)
            physicDelta = null;
        else
            physicDelta = (this.scene.physics.physicTime - this.scene.physics.gameTime) / ((this.scene.tickIntervalMs / 1000) << this.scene.physics.gameSpeed)
        let index = 0;
       // console.time('render bindgroups')
        const me = this;
        BindGroupDrawable.instances.forEach(function drawBindGroups(bgt) {
            if (bgt.meshes.size || bgt.subBindGroups.size) {
                bgt.onRender && me.onRenders.push(bgt.onRender);

                if (bgt.isDynamic) {
                    bgt.meshes.forEach(m => {
                        renderPass.setBindGroup(index, bgt.sharedBindgroup!, m.dynamicBindGroupOffset);
                        m.draw(renderPass, index);
                    });
                }
                else {
                    if (bgt.sharedBindgroup) {
                        renderPass.setBindGroup(index, bgt.sharedBindgroup);
                    }
                    bgt.meshes.forEach(m => {
                        me.properties |= m.properties;
                        m.draw(renderPass, index)
                    });
                }
                if (bgt.subBindGroups.size) {
                    index++;
                    bgt.subBindGroups.forEach(drawBindGroups);
                    index--;
                }
            }
        });
        Promise.all(this.onRenders.map(r => r(time, physicDelta))).then((buffers) => {
            const buffersNoNull = buffers.filter<GPUCommandBuffer>(function (buff): buff is GPUCommandBuffer { return buff !== null });
            this.device.defaultQueue.submit(buffersNoNull);
        });
        this.properties = 0;
       // console.timeEnd('render bindgroups')
       /* Promise.all(commandBuffers).then((buffers) => {
            const buffersNoNull = buffers.filter<GPUCommandBuffer>(function (buff): buff is GPUCommandBuffer { return buff !== null });
            this.device.defaultQueue.submit(buffersNoNull);
        });*/
    }
}
export abstract class GroupDrawable {
    static instances: Set<GroupDrawable> = new Set();

    abstract addRenderPipeline: (...args:any) => RenderPipeLine

    meshes: Set<RenderPipeLine> = new Set();
    properties: number = 0
    propertiesLength: number = 0
    subBindGroups: Set<GroupDrawable> = new Set();
    layout: GPUPipelineLayout;
    onRender: ((time: DOMHighResTimeStamp, timeDelta: number | null) => Promise<GPUCommandBuffer | null>) | null = null;
    constructor(public gpuscene: GPUScene, public bindGroupLayout: GPUBindGroupLayout, public parent?: GroupDrawable, public sharedBindgroup?: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), public isDynamic = false) {
        const layoutTree: GPUBindGroupLayout[] = [bindGroupLayout];
        if (parent) {
            let curparent: GroupDrawable | undefined = parent;
            do {
                layoutTree.unshift(curparent.bindGroupLayout);
            } while (curparent = curparent.parent)
            parent.subBindGroups.add(this);
        } else
            BindGroupDrawable.instances.add(this);
        this.layout = this.gpuscene.device.createPipelineLayout({ bindGroupLayouts: layoutTree });

    }
    addChildLayout(meshBindGroupLayout: BindGroupLayoutOneBinding<GPUBindGroupLayoutEntry>): LayoutGroupDrawable<[GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutTwoBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>): LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutThreeBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>): LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutFourBinding): LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: (BindGroupLayoutOneBinding<GPUBindGroupLayoutEntry> | BindGroupLayoutTwoBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> | BindGroupLayoutThreeBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> | BindGroupLayoutFourBinding)): LayoutGroupDrawable<GPUBindGroupEntry[]> {
        return new LayoutGroupDrawable(this.gpuscene, meshBindGroupLayout, this, undefined);
    }
    addChildBindGroup(sharedBindgroup: BindGroupOneBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number]>
    addChildBindGroup(sharedBindgroup: BindGroupTwoBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number, number]>
    addChildBindGroup(sharedBindgroup: BindGroupThreeBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number, number, number]>
    addChildBindGroup(sharedBindgroup: BindGroupFourBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number, number, number, number]>
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)): BindGroupDrawable
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), isDynamic?: boolean): any {
        if (!isDynamic) {
            return new BindGroupDrawable(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
        }

        return new DynamicBindGroupDrawable(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
    }

}
export class BindGroupDrawable extends GroupDrawable {
    addRenderPipeline = (renderPipeline: GPURenderPipelineDescriptor): RenderPipeLine => {
        const d = new RenderPipeLine(renderPipeline, this)
        this.meshes.add(d);
        return d;
    }
}
export class DynamicBindGroupDrawable<T extends number[]> extends GroupDrawable {
    addRenderPipeline = (renderPipeline: GPURenderPipelineDescriptor, offsets: T): RenderPipeLine => {
        const d = new RenderPipeLine(renderPipeline, this);
        d.dynamicBindGroupOffset = offsets;
        this.meshes.add(d);
        return d;
    }
}
export class LayoutGroupDrawable<T extends GPUBindGroupEntry[]> extends GroupDrawable {
    addRenderPipeline = (renderPipeline: GPURenderPipelineDescriptor, bindGroups: T): RenderPipeLine => {

        const d = new RenderPipeLine(renderPipeline, this)
        const bndGroup = this.gpuscene.device.createBindGroup(
            {
                layout: this.bindGroupLayout,
                entries: bindGroups
            }
        );
        d.bindGroups = new Set([bndGroup]);
        this.meshes.add(d);
        return d;
    }
}