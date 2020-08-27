import { Drawable } from "./drawables/Drawable";
import { worldPositionScene } from "./traits/worldPosition";
import type { TerraScene } from "./TerraScene";
import { Light } from "./lights";




export class GPUScene { 
    static canvas: HTMLCanvasElement;
    #bufferSizes: WeakMap<GPUBuffer, number> = new WeakMap();
    sampleCount: number = 1;

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
    timeBuffer = this.createGPUBuffer(4 + 4, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]);  //Todo: set to private
    //viewprojection and camera position
    uniformBuffer = this.createGPUBuffer(4 * 16 * 2 + 4 * 4 + 3 * 4, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]); //Todo: set to private

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

    #uniformBindGroup = this.createBindGroup(
        this.#uniformBindGroupLayoutWithTime,
        {
            binding: 0,
            resource: {
                buffer: this.uniformBuffer
            }
        }, {
        binding: 1,
        resource: {
            buffer: this.timeBuffer
        }
    });
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

    baseBindGroup = this.addBindGroup(this.#uniformBindGroup);
    baseBindGroupNoTime = this.addBindGroup(this.#uniformBindGroupNoTime);


    shaderModules: Map<string, GPUShaderModule> = new Map();
    
    worldPositionScene = new worldPositionScene(this);

   

    addBindGroup(bindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)) {
        const bglayout = this.GPUBindGroupLayouts.get(bindgroup);
        if (!bglayout)
            throw ('Bindgroup layout not found from weakmap');
        return new BindGroupDrawable(this, bglayout,undefined, bindgroup);
    }

    get canvas(): HTMLCanvasElement {
        return GPUScene.canvas;
    }

    

   /* createBindGroupLayout(entry1: GPUBindGroupLayoutEntryNoDynamic): BindGroupLayoutOneBinding
    createBindGroupLayout(entry1: GPUBindGroupLayoutEntryNoDynamic, entry2: GPUBindGroupLayoutEntryNoDynamic): BindGroupLayoutTwoBinding
    createBindGroupLayout(entry1: GPUBindGroupLayoutEntryNoDynamic, entry2: GPUBindGroupLayoutEntryNoDynamic, entry3: GPUBindGroupLayoutEntryNoDynamic): BindGroupLayoutThreeBinding
    createBindGroupLayout(entry1: GPUBindGroupLayoutEntryNoDynamic, entry2: GPUBindGroupLayoutEntryNoDynamic, entry3: GPUBindGroupLayoutEntryNoDynamic, entry4: GPUBindGroupLayoutEntryNoDynamic): BindGroupLayoutFourBinding*/

    //createBindGroupLayout2<T extends GPUBindGroupLayoutEntry[]>(...entries: [GPUBindGroupLayoutEntryReadStorage, ...GPUBindGroupLayoutEntry[]]): TerraBindGroupLayout<T, GPUStorageBuffer>
    createBindGroupLayout<T extends GPUBindGroupLayoutEntry>(entry: T): BindGroupLayoutOneBinding<T>
    createBindGroupLayout<T extends [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>(...entries:T): BindGroupLayoutTwoBinding<T>
    createBindGroupLayout<T extends [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>(...entries:T): BindGroupLayoutThreeBinding<T>
    createBindGroupLayout<T extends GPUBindGroupLayoutEntry[]>(...entries: T): TerraBindGroupLayout<T> {
        const layout = this.device.createBindGroupLayout({ entries }) as TerraBindGroupLayout<T>;
        layout.createBindGroup = (...entries: GPUBindGroupEntry[]) => {
            const bindGroup = this.device.createBindGroup({ layout, entries });
            this.GPUBindGroupLayouts.set(bindGroup, layout);
            return bindGroup
        }
        return this.device.createBindGroupLayout({ entries }) as TerraBindGroupLayout<T>;
    }

    //createBindGroupLayout(entry1: GPUBindGroupLayoutEntry): DynamicBindGroupLayoutOneBinding
  /*  createBindGroupLayout(entry1: GPUBindGroupLayoutEntry, entry2: GPUBindGroupLayoutEntry): DynamicBindGroupLayoutTwoBinding
    createBindGroupLayout(entry1: GPUBindGroupLayoutEntry, entry2: GPUBindGroupLayoutEntry, entry3: GPUBindGroupLayoutEntry): DynamicBindGroupLayoutThreeBinding
    createBindGroupLayout(entry1: GPUBindGroupLayoutEntry, entry2: GPUBindGroupLayoutEntry, entry3: GPUBindGroupLayoutEntry, entry4: GPUBindGroupLayoutEntry): DynamicBindGroupLayoutFourBinding
    createBindGroupLayout(...entries: GPUBindGroupLayoutEntry[]): GPUBindGroupLayout {
        return this.device.createBindGroupLayout({ entries });
    }*/

    //createBindGroup(layout: BindGroupLayoutOneBinding, entry1: GPUBindGroupEntry): BindGroupOneBinding
    createBindGroup<T extends GPUBindGroupLayout>(layout: T, ...entries: bindings<T>): getBindType<T>

  //  createBindGroup(layout: BindGroupLayoutOneBinding<GPUBindGroupLayoutEntry>, entry1: GPUBindGroupEntry): BindGroupOneBinding
  //  createBindGroup(layout: BindGroupLayoutTwoBinding<[GPUBindGroupLayoutEntry,GPUBindGroupLayoutEntry]>, entry1: GPUBindGroupEntry, entry2: GPUBindGroupEntry): BindGroupTwoBinding
   /* createBindGroup(layout: BindGroupLayoutThreeBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>, entry1: GPUBindGroupEntry, entry2: GPUBindGroupEntry, entry3: GPUBindGroupEntry): BindGroupThreeBinding
    createBindGroup(layout: BindGroupLayoutFourBinding, entry1: GPUBindGroupEntry, entry2: GPUBindGroupEntry, entry3: GPUBindGroupEntry, entry4: GPUBindGroupEntry): BindGroupFourBinding*/
    createBindGroup(layout: GPUBindGroupLayout, ...entries: GPUBindGroupEntry[]): GPUBindGroup {
        const bindGroup = this.device.createBindGroup({ layout, entries });
        this.GPUBindGroupLayouts.set(bindGroup, layout);
        return bindGroup
    }

    


    #uniformBufferSwap = this.createGPUBuffer(4 * 16 * 2 + 4 * 4 + 3 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);


    #timeBufferStorage = this.createGPUBuffer(8, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]); 
    static instance: GPUScene;
    //#bufferUpdateEncoders: WeakMap<GPUMapWriteBuffer, GPUCommandBuffer> = new WeakMap();
    #createdAt: number = new Date().getTime();
  


    lights = new Light(this);
    positionBindGroupLightsTime = this.lights.lightsBindGroup.addChildBindGroup(this.worldPositionScene.BindGroup, true);

    constructor(private scene: TerraScene, public device: GPUDevice) {
        this.worldPositionScene.positionBindGroupTime.onRender = async (time) => {
            return this.worldPositionScene.updateGPUBuffer();
        }
        this.positionBindGroupLightsTime.onRender = async (time) => {
            return this.worldPositionScene.updateGPUBuffer();
        }
        this.worldPositionScene.positionBindGroupNoTime.onRender = async (time) => {
            return this.worldPositionScene.updateGPUBuffer();
        }
        this.baseBindGroup.onRender = (time, delta) => {
            if (delta !== null) {
                var currentTime = new Float32Array([(this.#createdAt - time) % 100000 / 1000, delta]);
            } else
                var currentTime = new Float32Array([(this.#createdAt - time) % 100000 / 1000]);        
            return this.updateBuffer(this.#timeBufferStorage, this.timeBuffer, currentTime)
        }
   /*     this.lightsBindGroup.onRender = async (time) => {



        }*/
       /* const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.#timeBufferStorage, 0,
            this.timeBuffer, 0,
            4);
        this.#bufferUpdateEncoders.set(this.#timeBufferStorage, commandEncoder.finish());
        const commandEncoderView = device.createCommandEncoder();
        commandEncoderView.copyBufferToBuffer(
            this.#uniformBufferSwap, 0,
            this.uniformBuffer, 0,
            4 * 16 * 2 + 4 * 4 + 3 * 4
        );
        this.#bufferUpdateEncoders.set(this.#uniformBufferSwap, commandEncoderView.finish());*/
        GPUScene.instance = this;
    }
    async updateBuffer(buffer: GPUMapWriteBuffer, destination: GPUCopyDSTBuffer, ...data: Float32Array[]): Promise<GPUCommandBuffer | null> {
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
       /* data.forEach(view => {
            new Float32Array(buffer.getMappedRange(offset, view.byteLength)).set(view);
            offset += view.byteLength;
        });*/
        buffer.unmap();


        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            buffer, 0,
            destination, 0,
            size);
        this.#syncedBuffers.delete(buffer);
        return commandEncoder.finish();


        //Disabled untill command encoders can reuse;
        //this.device.defaultQueue.submit([this.#bufferUpdateEncoders.get(buffer)!])
        
    }
    async updateView(viewProjection: Float32Array, view: Float32Array, viewPosition: Float32Array, cameraPosition: Float32Array) {
        const encoder = await this.updateBuffer(this.#uniformBufferSwap, this.uniformBuffer, viewProjection, view, viewPosition, cameraPosition);
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


    createGPUBuffer(size: number, usages: number[], mappedAtCreation: boolean=false): GPUBuffer {
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

        return buff;
    }
    createCopy(commandEncoder: GPUCommandEncoder, ...buffers: GPUCopySRCBuffer[]): (GPUMapReadBuffer & GPUCopyDSTBuffer)[]  {
        const readBuffers: (GPUMapReadBuffer & GPUCopyDSTBuffer)[] = [];
        buffers.forEach(buffer => {
            let size: number | undefined;
            if (size = this.#bufferSizes.get(buffer)) {
                const gpuReadBuffer = this.createGPUBuffer(size, [GPUBufferUsage.COPY_DST ,GPUBufferUsage.MAP_READ])
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
    createUpdate(buffer: GPUCopyDSTBuffer, data: ArrayBuffer | SharedArrayBuffer): void {
        const commandEncoder = this.device.createCommandEncoder() as TerraGPUCommandEncoder;
        const gpuBuffer = this.createGPUBuffer(data.byteLength, [GPUBufferUsage.COPY_SRC], true);
        const arr = gpuBuffer.getMappedRange();
        new Int8Array(arr).set(new Int8Array(data));
        gpuBuffer.unmap();
        commandEncoder.copyBufferToBuffer(
            gpuBuffer, // source buffer
            0, //source offset
            buffer, //destination buffer
            0, //destination offset
            data.byteLength
        );
    }
    createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): TerraGPUCommandEncoder  {
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
    render(renderPass: GPURenderPassEncoder, time: DOMHighResTimeStamp) {
        let physicDelta: number | null;
        if (this.scene.physics.gameSpeed == -1)
            physicDelta = null;
        else
            physicDelta = (this.scene.physics.physicTime - this.scene.physics.gameTime) / ((this.scene.tickIntervalMs/1000) << this.scene.physics.gameSpeed)
        let index = 0;
        const commandBuffers: Promise<GPUCommandBuffer | null>[] = [];
        BindGroupDrawable.instances.forEach(function drawBindGroups(bgt) {
            if (bgt.meshes.size || bgt.subBindGroups.size) {
                bgt.onRender && commandBuffers.push(bgt.onRender(time, physicDelta));
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
                    bgt.meshes.forEach(m => m.draw(renderPass, index) );
                }
                if (bgt.subBindGroups.size) {
                    index++;
                    bgt.subBindGroups.forEach(drawBindGroups);
                    index--;
                }
            }
        });
        Promise.all(commandBuffers).then((buffers) => {
            const buffersNoNull = buffers.filter<GPUCommandBuffer>(function (buff): buff is GPUCommandBuffer { return buff !== null });
            this.device.defaultQueue.submit(buffersNoNull);
        });
    }
}
export class GroupDrawable {
    static instances: Set<GroupDrawable> = new Set();
    meshes: Set<Drawable> = new Set();
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
    addChildLayout(meshBindGroupLayout: BindGroupLayoutOneBinding<GPUBindGroupLayoutEntry>): LayoutGroupDrawable<[GPUBindGroup]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutTwoBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>): LayoutGroupDrawable<[GPUBindGroup, GPUBindGroup]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutThreeBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>): LayoutGroupDrawable<[GPUBindGroup, GPUBindGroup, GPUBindGroup]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutFourBinding): LayoutGroupDrawable<[GPUBindGroup, GPUBindGroup, GPUBindGroup, GPUBindGroup]>
    addChildLayout(meshBindGroupLayout: (BindGroupLayoutOneBinding<GPUBindGroupLayoutEntry> | BindGroupLayoutTwoBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> | BindGroupLayoutThreeBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> | BindGroupLayoutFourBinding)): LayoutGroupDrawable<GPUBindGroup[]> {
        return new LayoutGroupDrawable(this.gpuscene, meshBindGroupLayout, this, undefined);
    }
    addChildBindGroup(sharedBindgroup: BindGroupOneBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number]>
    addChildBindGroup(sharedBindgroup: BindGroupTwoBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number, number]>
    addChildBindGroup(sharedBindgroup: BindGroupThreeBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number, number]>
    addChildBindGroup(sharedBindgroup: BindGroupFourBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number, number]>
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)): BindGroupDrawable
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), isDynamic?: boolean): BindGroupDrawable | DynamicBindGroupDrawable<number[]> {
        if (!isDynamic)
            return new BindGroupDrawable(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
        return new DynamicBindGroupDrawable(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
    }

}
export class BindGroupDrawable extends GroupDrawable {
    addDrawable(renderPipeline: GPURenderPipelineDescriptor, indexOrVertexCount: number, instanceCount = 1, firstInstance = 0, firstVertexOrIndex = 0): Drawable {
        if (!renderPipeline.rasterizationState) {
            renderPipeline.rasterizationState = {
                cullMode: 'front',
            }
        }
        const d = new Drawable(renderPipeline, indexOrVertexCount, instanceCount, firstInstance, firstVertexOrIndex, this)
        this.meshes.add(d);
        return d;
    }
}
export class DynamicBindGroupDrawable<T extends number[]> extends GroupDrawable {
    addDrawable(renderPipeline: GPURenderPipelineDescriptor, offsets: T, indexOrVertexCount: number, instanceCount = 1, firstInstance = 0, firstVertexOrIndex = 0): Drawable {
        if (!renderPipeline.rasterizationState) {
            renderPipeline.rasterizationState = {
                cullMode: 'front',
            }
        }
        if (!renderPipeline.depthStencilState) {
            renderPipeline.depthStencilState = {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus-stencil8",
            }
        }

        const d = new Drawable(renderPipeline, indexOrVertexCount, instanceCount, firstInstance, firstVertexOrIndex, this);
        d.dynamicBindGroupOffset = offsets;
        this.meshes.add(d);
        return d;
    }
}
export class LayoutGroupDrawable<T extends GPUBindGroup[]> extends GroupDrawable {
    addDrawable(renderPipeline: GPURenderPipelineDescriptor, bindGroups:T, indexOrVertexCount: number, instanceCount = 1, firstInstance = 0, firstVertexOrIndex = 0): Drawable {
        if (!renderPipeline.rasterizationState) {
            renderPipeline.rasterizationState = {
                cullMode: 'front',
            }
        }
        const d = new Drawable(renderPipeline, indexOrVertexCount, instanceCount, firstInstance, firstVertexOrIndex, this)
        d.bindGroups=new Set(bindGroups);
        this.meshes.add(d);
        return d;
    }
}