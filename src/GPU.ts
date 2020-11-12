import { Light } from "./lights";
import { TerraNode } from "./TerraNode";
import { RenderPass, RenderPassCanvas } from "./GPU/RenderPass";
import { BindGroupLayout, DynamicBindGroupDrawable } from "./GPU/BindGroupLayout";




export class GPU {
    #bufferSizes: WeakMap<GPUBuffer, number> = new WeakMap();
    #bufferIndexFormats: WeakMap<GPUBuffer, GPUIndexFormat> = new WeakMap();


    NodeInstances: Map<TerraNode, number> = new Map();

    GPUBindGroupLayouts: WeakMap<GPUBindGroup, GPUBindGroupLayout> = new WeakMap();
    DynamicBindGroups: WeakSet<GPUBindGroup> = new WeakSet();

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
    uniformBufferInvertedView = this.createGPUBuffer(4 * 16 * 2 + 3 * 4, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]); //Todo: set to private

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

    baseBindGroup: BindGroupLayout;

    baseBindGroupNoTime = this.addBindGroup(this.#uniformBindGroupNoTime);


    shaderModules: Map<string, GPUShaderModule> = new Map();
    //Todo: Remove COPY_SRC
    GPUData = this.createGPUBuffer(TerraNode.alignment * TerraNode.maxInstances, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);



    positionBindGroupTime;
    
    lights: Light;
    positionBindGroupLightsTime: DynamicBindGroupDrawable<[number]>;
    positionBindGroupLightsTimeWGSL: DynamicBindGroupDrawable<[number]>;
    BindGroup: BindGroupOneBinding;
    positionBindGroupNoTime: DynamicBindGroupDrawable<[number]>;
    BindGroupLayout = this.createBindGroupLayout({ binding: 0, visibility: GPUShaderStage.VERTEX, type: "uniform-buffer", hasDynamicOffset: true });

    addBindGroup<T>(bindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), properties?:T) {
        const bglayout = this.GPUBindGroupLayouts.get(bindgroup);
        if (!bglayout)
            throw ('Bindgroup layout not found from weakmap');
        return new BindGroupLayout(this, bglayout, undefined, bindgroup);
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
    #uniformBufferSwap2 = this.createGPUBuffer(4 * 16 * 2 + 3 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.MAP_WRITE]);

    static instance: GPU;

    
    
    onResizes: Set<() => void> = new Set();

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
        });
        tempBuffer.unmap();
        this.queue.clear();

        this.#busy = false;
        return commandEncoder.finish();
    }
    buildBindGroupHierarcy(baseBindGroup: BindGroupLayout, ...bindgroups: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)[]) {
        let parentBGLayout = baseBindGroup;
        let childBG: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding) | undefined
        while (childBG = bindgroups.shift()) {
            if (this.DynamicBindGroups.has(childBG))
                parentBGLayout = parentBGLayout.addChildBindGroup(childBG, true);
            else
                parentBGLayout = parentBGLayout.addChildBindGroup(childBG);
        }
        return parentBGLayout;
    }
    constructor(public device: GPUDevice, public renderPassScreen: RenderPassCanvas, public renderPassWater: RenderPass) {

        this.BindGroup = this.createBindGroup(this.BindGroupLayout,
            {
                binding: 0,
                resource: {
                    buffer: this.GPUData,
                    offset: 0,
                    size: TerraNode.GPUDataSize
                }
            });
        this.DynamicBindGroups.add(this.BindGroup);
        this.positionBindGroupNoTime = this.baseBindGroupNoTime.addChildBindGroup(this.BindGroup, true);

        const timeAndDeltaBuffer = new ArrayBuffer(12);
        const timeBuffer = this.createGPUBuffer(timeAndDeltaBuffer.byteLength, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]);
        const timeGroup = {
            binding: 1,
            resource: {
                buffer: timeBuffer
            }
        }
        const uniformBindGroup = this.createBindGroup(
                this.#uniformBindGroupLayoutWithTime,
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer
                    }
            }, timeGroup);
        const uniformBindGroupInvertedView = this.createBindGroup(
            this.#uniformBindGroupLayoutWithTime,
            {
                binding: 0,
                resource: {
                    buffer: this.uniformBufferInvertedView
                }
            }, timeGroup);
        this.baseBindGroup = this.addBindGroup(uniformBindGroup, { animate1: false });
        this.baseBindGroup.sharedBindGroupOverwrites.set(renderPassWater, uniformBindGroupInvertedView)
       // this.positionBindGroupTime = this.baseBindGroup.addChildBindGroup(this.BindGroup, true);
        this.positionBindGroupTime = this.buildBindGroupHierarcy(this.baseBindGroup,this.BindGroup)
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
        this.positionBindGroupLightsTimeWGSL = this.lights.lightsBindGroupWGSL.addChildBindGroup(this.BindGroup, true);

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
        GPU.instance = this;
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
    async updateView(viewProjectionPositionBuffer: ArrayBuffer) {
        const encoder = await this.updateBufferRaw(this.#uniformBufferSwap, this.uniformBuffer, viewProjectionPositionBuffer);
        if (encoder)
            this.device.defaultQueue.submit([encoder]);
    }
    async updateView2(viewProjectionPositionBuffer: ArrayBuffer) {
        const encoder = await this.updateBufferRaw(this.#uniformBufferSwap2, this.uniformBufferInvertedView, viewProjectionPositionBuffer);
        if (encoder)
            this.device.defaultQueue.submit([encoder]);
    }

    createInputBuffer(usage: typeof GPUBufferUsage.VERTEX, data: Float32Array): [SharedArrayBuffer, GPUVertexBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.INDEX, data: (Uint16Array | Uint32Array)): [SharedArrayBuffer, GPUIndexBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.VERTEX, data: Float32Array, updatable: boolean): [SharedArrayBuffer, GPUVertexBuffer & GPUCopyDSTBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.INDEX, data: Uint16Array | Uint32Array, updatable: boolean): [SharedArrayBuffer, GPUIndexBuffer & GPUCopyDSTBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.VERTEX, data: Float32Array | Uint16Array | Uint32Array, updatable = false) {
        const CPUBuffer = new SharedArrayBuffer(data.byteLength);
        const uintView = new Uint8Array(data.buffer);
        new Uint8Array(CPUBuffer).set(uintView);
        if (updatable)
            usage |= GPUBufferUsage.COPY_DST;
        const GPUBuffer = this.device.createBuffer({ usage, size: data.byteLength, mappedAtCreation: true });
        new Uint8Array(GPUBuffer.getMappedRange()).set(uintView);
        GPUBuffer.unmap();
        return [CPUBuffer, GPUBuffer]
    }
    #syncedBuffers: WeakSet<GPUMapWriteBuffer | GPUMapReadBuffer> = new WeakSet()
    //uniform
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUUniformBuffer & GPUCopyDSTBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUUniformBuffer & GPUCopyDSTBuffer & GPUStorageBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUUniformBuffer & GPUCopyDSTBuffer & GPUStorageBuffer & GPUCopySRCBuffer
    //index
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX], mappedAtCreation?: boolean): GPUIndexBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUIndexBuffer & GPUCopyDSTBuffer
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
    render(renderPassEncoder: GPURenderPassEncoder, renderPass: RenderPass, time: DOMHighResTimeStamp, physicDelta: number | null) {
        let index = 0;
        // console.time('render bindgroups')
        const me = this;
        BindGroupLayout.instances.forEach(function drawBindGroups(bgt) {
            if (bgt.renderPipeLines.size || bgt.subBindGroups.size) {
                bgt.onRender && me.onRenders.push(bgt.onRender);
                if (bgt.sharedBindgroup && me.DynamicBindGroups.has(bgt.sharedBindgroup)) {
                    //if (bgt.isDynamic) {
                    bgt.renderPipeLines.forEach(m => {
                        renderPassEncoder.setBindGroup(index, bgt.sharedBindgroup!, m.dynamicBindGroupOffset);
                        m.draw(renderPassEncoder, renderPass, index);
                    });
                }
                else {
                    if (bgt.sharedBindgroup) {
                        renderPassEncoder.setBindGroup(index, bgt.sharedBindGroupOverwrites.get(renderPass) || bgt.sharedBindgroup);
                    }
                    bgt.renderPipeLines.forEach(m => {
                        me.properties |= m.properties;
                        m.draw(renderPassEncoder, renderPass, index)
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

/*export class BindGroupDrawable extends GroupDrawable {
    addRenderPipeline = (renderPipeline: GPURenderPipelineDescriptor): RenderPipeLine => {
        const d = new RenderPipeLine(renderPipeline, this)
        this.renderPipeLines.add(d);
        return d;
    }
}*/
