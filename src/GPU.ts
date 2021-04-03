import { TerraNodeGPU } from "./TerraNode.js";
import type { RenderPass } from "./GPU/RenderPass.js";
import { PipelineLayout } from "./GPU/PipelineLayout.js";
import type { Scene } from "./Scene.js";
import { RenderTarget } from "./GPU/RenderTarget.js";
type CopyBuffers<T> = {
    [K in keyof T]: (GPUMapReadBuffer & GPUCopyDSTBuffer)
};
type TerraBindGroupEntry = GPUBindGroupEntry | { binding: number, resource: RenderTarget<GPUTexture> }
type bindings<T> = T extends BindGroupLayoutOneBinding ? [TerraBindGroupEntry]
    : T extends BindGroupLayoutTwoBinding ? [TerraBindGroupEntry, TerraBindGroupEntry]
    : T extends BindGroupLayoutThreeBinding ? [TerraBindGroupEntry, TerraBindGroupEntry, TerraBindGroupEntry]
    : T extends BindGroupLayoutFourBinding ? [TerraBindGroupEntry, TerraBindGroupEntry, TerraBindGroupEntry, TerraBindGroupEntry]
    : T extends BindGroupLayoutFiveBinding ? [TerraBindGroupEntry, TerraBindGroupEntry, TerraBindGroupEntry, TerraBindGroupEntry, TerraBindGroupEntry]
    : never;


export class GPU {
    #bufferSizes: WeakMap<GPUBuffer, number> = new WeakMap();
    GPUBindGroupLayouts: WeakMap<GPUBindGroup, GPUBindGroupLayout> = new WeakMap();
    #DynamicBindGroups: WeakSet<GPUBindGroup> = new WeakSet();

    uniformBindGroupLayoutWithTime = this.createBindGroupLayout(
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform"
            }
        },
        {
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform"
            }
        }
    );
    uniformBindGroupLayoutLightsWGSL2 = this.createBindGroupLayout({
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
            type: "uniform"
        }
    });
    rootCameralayout = new PipelineLayout(this, this.uniformBindGroupLayoutWithTime, undefined, undefined, false, true);
    rootSceneLayout = new PipelineLayout(this, this.uniformBindGroupLayoutLightsWGSL2, this.rootCameralayout, undefined, false);

    //viewprojection and camera position

    singleWritableStorageLayout = this.device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            }]
    })

    shaderModules: Map<string, GPUShaderModule> = new Map();
    //Todo: Remove COPY_SRC
    GPUData = this.createGPUBuffer(TerraNodeGPU.alignment * TerraNodeGPU.maxInstances, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);

    BindGroupLayoutCanvas = this.createBindGroupLayout(
        {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {

            }
        },
        {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {

            }
        }, {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {

        }
    },
        {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {

            }
        }, {
        binding: 4,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
            type: "read-only-storage"
        }
    });


    rootLayout = new PipelineLayout(this, this.BindGroupLayoutCanvas);
    BindGroupLayout = this.createBindGroupLayout(
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform",
                hasDynamicOffset: true
            }
        });
    BindGroup = this.createBindGroup(this.BindGroupLayout,
        {
            binding: 0,
            resource: {
                buffer: this.GPUData,
                offset: 0,
                size: TerraNodeGPU.GPUDataSize * 4
            }
        });
    timeGroup: { binding: number; resource: { buffer: GPUUniformBuffer & GPUCopyDSTBuffer; }; };
    timeBuffer: GPUUniformBuffer & GPUCopyDSTBuffer;

    context: GPUCanvasContext;

    createBindGroupLayout(entry: GPUBindGroupLayoutEntry): BindGroupLayoutOneBinding
    createBindGroupLayout(...entries: [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]): BindGroupLayoutTwoBinding
    createBindGroupLayout(...entries: [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]): BindGroupLayoutThreeBinding
    createBindGroupLayout(...entries: [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]): BindGroupLayoutFourBinding
    createBindGroupLayout(...entries: [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]): BindGroupLayoutFiveBinding
    createBindGroupLayout<T extends GPUBindGroupLayoutEntry[]>(...entries: T): TerraBindGroupLayout {
        const layout = this.device.createBindGroupLayout({ entries }) as TerraBindGroupLayout;
        layout.createBindGroup = (...entries: GPUBindGroupEntry[]) => {
            const bindGroup = this.device.createBindGroup({ layout, entries });
            this.GPUBindGroupLayouts.set(bindGroup, layout);
            return bindGroup
        }
        return this.device.createBindGroupLayout({ entries }) as TerraBindGroupLayout;
    }
    createBindGroupForRenderPass<T extends GPUBindGroupLayout, U extends bindings<T>>(layout: T, renderPass:RenderPass, ...entries: U): getBindType<T>
    createBindGroupForRenderPass(layout: GPUBindGroupLayout, renderPass:RenderPass, ...entries: (GPUBindGroupEntry | { binding: number, resource: RenderTarget<GPUTexture> })[]): GPUBindGroup {
        const bindGroup = this.device.createBindGroup({
            layout, entries: entries.map<GPUBindGroupEntry>(entry => {
                if (entry.resource instanceof RenderTarget) {
                    entry.resource.renderPasses.add(renderPass);
                    entry.resource = entry.resource.view;
                }
                return entry as GPUBindGroupEntry;
            })
        });
        this.GPUBindGroupLayouts.set(bindGroup, layout);
        return bindGroup
    }
    createBindGroup<T extends GPUBindGroupLayout, U extends bindings<T>>(layout: T, ...entries: U): getBindType<T>
    createBindGroup(layout: GPUBindGroupLayout, ...entries: GPUBindGroupEntry[]): GPUBindGroup {
        const bindGroup = this.device.createBindGroup({
            layout, entries
        });
        this.GPUBindGroupLayouts.set(bindGroup, layout);
        return bindGroup
    }

    static instance: GPU;

    queue: Map<Float32Array, number> = new Map();

    renderPassScreen: RenderPass
    renderPassWater: RenderPass
    renderPassCanvas: RenderPass;
    renderPasses: Set<RenderPass>;

    readonly scale = {
        x: 1,
        y: 1
    }
    constructor(public canvas: HTMLCanvasElement, public device: GPUDevice, createRenderPasses: (gpu: GPU) => [RenderPass, RenderPass, RenderPass]) {
        const context = canvas.getContext('gpupresent');
        if (!context)
            throw ('Unable to get webgpu context')
        this.context = context;
        //Scene layoyt is iterated manually so remove it not to iterate it twise.
        this.rootCameralayout.subBindGroups.delete(this.rootSceneLayout);

        const renderPasses = createRenderPasses(this);
        this.renderPasses = new Set(renderPasses);
        [this.renderPassCanvas, this.renderPassScreen, this.renderPassWater] = renderPasses;


        this.#DynamicBindGroups.add(this.BindGroup);
        const timeAndDeltaBuffer = new ArrayBuffer(8);
        this.timeBuffer = this.createGPUBuffer(timeAndDeltaBuffer.byteLength, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST]);
        this.timeGroup = {
            binding: 1,
            resource: {
                buffer: this.timeBuffer
            }
        }
        GPU.instance = this;
    }
    updateBufferRaw(commandEncoder: GPUCommandEncoder, destination: GPUCopyDSTBuffer, data: ArrayBuffer) {
        const tempBuffer = this.createGPUBuffer(data.byteLength, [GPUBufferUsage.COPY_SRC], true);
        new Int8Array(tempBuffer.getMappedRange()).set(new Int8Array(data));
        tempBuffer.unmap();
        commandEncoder.copyBufferToBuffer(
            tempBuffer, 0,
            destination, 0,
            data.byteLength);
    }
    async updateBuffer(buffer: GPUCopySRCBuffer, destination: GPUCopyDSTBuffer, ...data: (Float32Array | Uint32Array)[]): Promise<GPUCommandBuffer | null> {
        const size = data.reduce((prev, curr) => prev + curr.byteLength, 0);
        await buffer.mapAsync(GPUMapMode.WRITE, 0, size);
        let offset = 0;
        data.forEach(view => {
            new Int8Array(buffer.getMappedRange(offset, view.byteLength)).set(new Int8Array(view.buffer, 0, view.byteLength));
            offset += view.byteLength;
        });
        return this.copyBufferToBuffer(buffer, destination, size)
    }
    copyBufferToBuffer(buffer: GPUCopySRCBuffer, destination: GPUCopyDSTBuffer, size: number): GPUCommandBuffer {
        buffer.unmap();
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            buffer, 0,
            destination, 0,
            size);
        return commandEncoder.finish();
    }

    createInputBuffer(usage: typeof GPUBufferUsage.VERTEX, data: SharedArrayBuffer): GPUVertexBuffer
    createInputBuffer(usage: typeof GPUBufferUsage.VERTEX, data: Float32Array): [SharedArrayBuffer, GPUVertexBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.INDEX, data: (Uint16Array | Uint32Array)): [SharedArrayBuffer, GPUIndexBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.VERTEX, data: Float32Array, updatable: boolean): [SharedArrayBuffer, GPUVertexBuffer & GPUCopyDSTBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.INDEX, data: Uint16Array | Uint32Array, updatable: boolean): [SharedArrayBuffer, GPUIndexBuffer & GPUCopyDSTBuffer]
    createInputBuffer(usage: typeof GPUBufferUsage.INDEX | typeof GPUBufferUsage.VERTEX, data: Float32Array | Uint16Array | Uint32Array | SharedArrayBuffer, updatable = false) {
        if (data instanceof SharedArrayBuffer) {
            var CPUBuffer = data;
            var uintView = new Uint8Array(CPUBuffer);
        }
        else {
            var CPUBuffer = new SharedArrayBuffer(data.byteLength);
            var uintView = new Uint8Array(CPUBuffer);
            uintView.set(new Uint8Array(data.buffer));
        }
        if (updatable)
            usage |= GPUBufferUsage.COPY_DST;
        const GPUBuffer = this.device.createBuffer({ usage, size: data.byteLength, mappedAtCreation: true });
        new Uint8Array(GPUBuffer.getMappedRange()).set(uintView);
        GPUBuffer.unmap();
        if (data instanceof SharedArrayBuffer)
            return GPUBuffer;
        return [CPUBuffer, GPUBuffer]
    }
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
    //indirect
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDIRECT], mappedAtCreation?: boolean): GPUIndirectBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.INDIRECT | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.INDIRECT | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUIndirectBuffer & GPUCopyDSTBuffer

    //storage 
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUStorageBuffer //(can be mapped at creation)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUStorageBuffer & GPUCopySRCBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUStorageBuffer & GPUCopyDSTBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC, typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUStorageBuffer & GPUCopyDSTBuffer & GPUCopySRCBuffer

    //MAP read (Only CopyDst is allowed with MapRead)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUMapReadBuffer & GPUCopyDSTBuffer

    //MAP write (Only CopySrc is allowed with MapWrite)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.MAP_WRITE, typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.MAP_WRITE], mappedAtCreation?: boolean): GPUMapWriteBuffer & GPUCopySRCBuffer
    //copy source for mapped at creation
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUCopySRCBuffer


    createGPUBuffer(size: number, usages: number[], mappedAtCreation: boolean = false): GPUBuffer {
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
    createGPUTexture(size: GPUExtent3DStrict, format: GPUTextureFormat, usages: [typeof GPUTextureUsage.SAMPLED], sampleCount?: number): GPUTextureSampled
    createGPUTexture(size: GPUExtent3DStrict, format: GPUTextureFormat, usages: number[], sampleCount?: number): GPUTexture
    createGPUTexture(size: GPUExtent3DStrict, format: GPUTextureFormat, usages: number[], sampleCount = 1): GPUTexture {
        const usage = usages.reduce((prev, curr) => prev | curr, 0);
        return this.device.createTexture({
            size, sampleCount, format,
            usage,
        });
    }

    createCopy<T extends GPUCopySRCBuffer[]>(commandEncoder: GPUCommandEncoder, ...buffers: T): CopyBuffers<T> {
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
        return readBuffers as CopyBuffers<T>;
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
        this.device.queue.submit([commandEncoder.finish()]);
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
    readonly onRenders2: (() => (GPUCommandBuffer | null))[] = []
    pendingCommandBuffers: GPUCommandBuffer[] = [];
    drawBindGroups(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, bgt: PipelineLayout, renderPass: RenderPass, index: number, scene?: Scene) {
        let drawedMeshes = 0;
        if (bgt.renderPipeLines.size || bgt.subBindGroups.size) {
            if (bgt.sharedBindgroup && this.#DynamicBindGroups.has(bgt.sharedBindgroup)) {
                bgt.renderPipeLines.forEach(m => {
                    renderPassEncoder.setBindGroup(index, bgt.sharedBindgroup!, m.dynamicBindGroupOffset.map(o => o * TerraNodeGPU.alignment));
                    drawedMeshes += m.draw(renderPassEncoder, renderPass, index, scene);
                });
            }
            else {
                if (bgt.sharedBindgroup) {
                    renderPassEncoder.setBindGroup(index, bgt.sharedBindgroup);
                }
                bgt.renderPipeLines.forEach(m => {
                    drawedMeshes += m.draw(renderPassEncoder, renderPass, index, scene)
                });
            }
            if (bgt.subBindGroups.size) {
                bgt.subBindGroups.forEach((bgt) => { drawedMeshes += this.drawBindGroups(renderPassEncoder, bgt, renderPass, ++index, scene) });
            }
        }
        return drawedMeshes;
    }
}