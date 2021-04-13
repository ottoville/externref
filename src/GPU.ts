import { BoundableNode, TerraNodeGPU } from "./TerraNode.js";
import { RenderPass } from "./GPU/RenderPass.js";
import { PipelineLayout } from "./GPU/PipelineLayout.js";
import { RenderTarget } from "./GPU/RenderTarget.js";
import { DrawableDirect } from "./GPU/Drawable.js";
import { BindGroupLayout } from "./GPU/BindGroupLayout.js";

type CopyBuffers<T> = {
    [K in keyof T]: (GPUMapReadBuffer & GPUCopyDSTBuffer)
};
type MapToGPUBindGroupEntry<T> = { [K in keyof T]: (GPUBindGroupEntry | { binding: number, resource: RenderTarget<GPUTexture> }) };
type extractGeneric<Type> = Type extends BindGroupLayout<infer X> ? X : never
interface TerraGPUBindGroupLayoutDescriptorOne
    extends GPUBindGroupLayoutDescriptor {
    entries: [GPUBindGroupLayoutEntry];
}
interface TerraGPUBindGroupLayoutDescriptorTwo
    extends GPUBindGroupLayoutDescriptor {
    entries: [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry];
}
interface TerraGPUBindGroupLayoutDescriptorThree
    extends GPUBindGroupLayoutDescriptor {
    entries: [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry];
}
interface TerraGPUBindGroupLayoutDescriptorFour
    extends GPUBindGroupLayoutDescriptor {
    entries: [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry];
}
interface TerraGPUBindGroupLayoutDescriptorFive
    extends GPUBindGroupLayoutDescriptor {
    entries: [GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry];
}



export class GPU {
    #bufferSizes: WeakMap<GPUBuffer, number> = new WeakMap();
    GPUBindGroupLayouts: WeakMap<GPUBindGroup, BindGroupLayout<GPUBindGroupEntry[]>> = new WeakMap();
    #DynamicBindGroups: WeakSet<GPUBindGroup> = new WeakSet();
    swapChain: GPUSwapChain;

    addTarget(format: GPUTextureFormat, loadValue: GPULoadOp | GPUColor, usages: [typeof GPUTextureUsage.SAMPLED], sampleCount?: number): RenderTarget<GPUTextureSampled>
    addTarget(format: GPUTextureFormat, loadValue: GPULoadOp | GPUColor, usages: [typeof GPUTextureUsage.RENDER_ATTACHMENT], sampleCount?: number): RenderTarget<GPUTextureRenderAttachment>
    addTarget(format: GPUTextureFormat, loadValue: GPULoadOp | GPUColor, usages: [typeof GPUTextureUsage.SAMPLED | typeof GPUTextureUsage.RENDER_ATTACHMENT, typeof GPUTextureUsage.SAMPLED | typeof GPUTextureUsage.RENDER_ATTACHMENT], sampleCount?: number): RenderTarget<GPUTextureSampled | GPUTextureRenderAttachment>
    addTarget(format: GPUTextureFormat, loadValue: GPULoadOp | GPUColor, usages: [typeof GPUTextureUsage.SAMPLED | typeof GPUTextureUsage.RENDER_ATTACHMENT | typeof GPUTextureUsage.COPY_SRC, typeof GPUTextureUsage.SAMPLED | typeof GPUTextureUsage.RENDER_ATTACHMENT | typeof GPUTextureUsage.COPY_SRC, typeof GPUTextureUsage.SAMPLED | typeof GPUTextureUsage.RENDER_ATTACHMENT | typeof GPUTextureUsage.COPY_SRC], sampleCount?: number): RenderTarget<GPUTextureSampled | GPUTextureRenderAttachment | GPUTextureCopySrc>
    addTarget(format: GPUTextureFormat, loadValue: GPULoadOp | GPUColor, usages: GPUTextureUsageFlags[], sampleCount = 1): RenderTarget<GPUTexture> {
        return new RenderTarget(this, format, loadValue, usages.reduce((prev, curr) => prev | curr, GPUTextureUsage.RENDER_ATTACHMENT), sampleCount)
    }
    boundables: Set<BoundableNode<DrawableDirect>> = new Set();
    uniformBindGroupLayoutWithTime = this.createBindGroupLayout({
        label: 'uniformBindGroupLayoutWithTime',
        entries:
            [
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
            ]
    }

    );
    uniformBindGroupLayoutLightsWGSL2 = this.createBindGroupLayout({
        label: 'uniformBindGroupLayoutLightsWGSL2',
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform"
            }
        }]
    });
    rootCameralayout = new PipelineLayout(this, this.uniformBindGroupLayoutWithTime, undefined, undefined, false, true);
    //rootSceneLayout = new PipelineLayout(this, this.uniformBindGroupLayoutLightsWGSL2, this.rootCameralayout, undefined, false);

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

    #BindGroupLayoutCanvas = this.createBindGroupLayout({
        entries: [
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
            }
        ]
    }
    );


    rootLayout = new PipelineLayout(this, this.#BindGroupLayoutCanvas);
    BindGroupLayoutPosition = this.createBindGroupLayout({
        label: 'BindGroupLayoutPosition',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform",
                    hasDynamicOffset: true
                }
            }]
    });
    positionBindGroupTimeWGSL = this.rootCameralayout.addChildLayout(this.BindGroupLayoutPosition);

    lightsBindGroupTexture2 = this.positionBindGroupTimeWGSL.addChildLayout(this.createBindGroupLayout({
        label: 'lightsBindGroupTexture2',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {},
            }, {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {}
            }/*,
            {
                binding: 2,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform",
                    hasDynamicOffset: true
                }
            }*/
        ]
    }));

    BindGroupPosition = this.createBindGroup(this.BindGroupLayoutPosition, [
        {
            binding: 0,
            resource: {
                buffer: this.GPUData,
                offset: 0,
                size: TerraNodeGPU.GPUDataSize * 4
            }
        }]);
    positionBindGroupTime = this.rootCameralayout.addChildBindGroup(this.BindGroupPosition, true)
    timeGroup: { binding: number; resource: { buffer: GPUUniformBuffer & GPUCopyDSTBuffer; }; };
    timeBuffer: GPUUniformBuffer & GPUCopyDSTBuffer;

    BindGroupCanvas: (renderPass: RenderPass<{}>) => GPUBindGroup;

    createBindGroupLayout(entry: TerraGPUBindGroupLayoutDescriptorOne, dynamicIndices?: number[]): BindGroupLayout<[GPUBindGroupEntry]>
    createBindGroupLayout(entry: TerraGPUBindGroupLayoutDescriptorTwo, dynamicIndices?: number[]): BindGroupLayout<[GPUBindGroupEntry, GPUBindGroupEntry]>
    createBindGroupLayout(entry: TerraGPUBindGroupLayoutDescriptorThree, dynamicIndices?: number[]): BindGroupLayout<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>
    createBindGroupLayout(entry: TerraGPUBindGroupLayoutDescriptorFour, dynamicIndices?: number[]): BindGroupLayout<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>
    createBindGroupLayout(entry: TerraGPUBindGroupLayoutDescriptorFive, dynamicIndices?: number[]): BindGroupLayout<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>
    createBindGroupLayout<T extends TerraGPUBindGroupLayoutDescriptorFive>(entry: T, dynamicIndices?: number[]): BindGroupLayout<GPUBindGroupEntry[]> {

        return new BindGroupLayout<[GPUBindGroupEntry]>(this, entry, dynamicIndices)
        /*const layout = this.device.createBindGroupLayout(entry) as TerraBindGroupLayout;
        layout.createBindGroup = (...entries: GPUBindGroupEntry[]) => {
            const bindGroup = this.device.createBindGroup({ layout, entries });
            this.GPUBindGroupLayouts.set(bindGroup, layout);
            return bindGroup
        }
        return layout;*/
    }
    createBindGroupForRenderPass<T extends BindGroupLayout<GPUBindGroupEntry[]>>(layout: T, renderPass: RenderPass<{}>, entries: MapToGPUBindGroupEntry<extractGeneric<T>>): GPUBindGroup {
        //createBindGroupForRenderPass(layout:  BindGroupLayout<[GPUBindGroupEntry,GPUBindGroupEntry]>, renderPass: RenderPass<{}>, entries: [(GPUBindGroupEntry | { binding: number, resource: RenderTarget<GPUTexture> })]): GPUBindGroup {
        const bindGroup = this.device.createBindGroup({
            //@ts-expect-error
            layout: layout.layout, entries: (entries as GPUBindGroupEntry[]).map<GPUBindGroupEntry>(entry => {
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
    createBindGroup<T extends BindGroupLayout<GPUBindGroupEntry[]>>(layout: T, entries: MapToGPUBindGroupEntry<extractGeneric<T>>): GPUBindGroup {
        //createBindGroup(layout: BindGroupLayout<GPUBindGroupEntry[]>, ...entries: GPUBindGroupEntry[]): GPUBindGroup {

        const bindGroup = this.device.createBindGroup({
            //@ts-expect-error
            layout: layout.layout, entries
        });
        this.GPUBindGroupLayouts.set(bindGroup, layout);
        return bindGroup
    }

    static instance: GPU;

    queue: Map<Float32Array, number> = new Map();

    renderPassScreen = new RenderPass(this, {
        gRenderTargetNormals: this.addTarget("bgra8unorm", { r: 0.0, g: 1.0, b: 0.0, a: 1.0 }, [GPUTextureUsage.RENDER_ATTACHMENT, GPUTextureUsage.SAMPLED], 1),
        gRenderTargetPositions: this.addTarget("rgba32float", { r: 0.0, g: 1.0, b: 0.0, a: 0.0 }, [GPUTextureUsage.RENDER_ATTACHMENT, GPUTextureUsage.SAMPLED, GPUTextureUsage.COPY_SRC]),
        gRenderTargetDiffuse: this.addTarget("bgra8unorm", { r: 0.53, g: 0.8, b: 0.92, a: 0.0 }, [GPUTextureUsage.RENDER_ATTACHMENT, GPUTextureUsage.SAMPLED], 1)
    }, 1, true, { width: this.canvas.width, height: this.canvas.height },
        (w, h) => {
            return [w, h]
        });
    renderPassWater = new RenderPass(this, {
        normals: this.addTarget("bgra8unorm", { r: 0.0, g: 1.0, b: 0.0, a: 1.0 }, [GPUTextureUsage.RENDER_ATTACHMENT, GPUTextureUsage.SAMPLED], 1),
        position: this.addTarget("rgba32float", { r: 0.0, g: 1.0, b: 0.0, a: 1.0 }, [GPUTextureUsage.RENDER_ATTACHMENT, GPUTextureUsage.SAMPLED]),
        diffuse: this.addTarget("bgra8unorm", { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }, [GPUTextureUsage.RENDER_ATTACHMENT, GPUTextureUsage.SAMPLED], 1)
    }, 1, false, { width: this.canvas.width, height: this.canvas.height }, (w, h) => [w >> 2, h >> 2], GPUTextureUsage.SAMPLED)
    renderPassCanvas = new RenderPass(this, {
        swap: this.addTarget("bgra8unorm", { r: 0.53, g: 0.8, b: 0.92, a: 1.0 }, [GPUTextureUsage.RENDER_ATTACHMENT], 1)
    }, 1, false, { width: this.canvas.width, height: this.canvas.height },
        (w, h) => {
            return [w, h]
        });
    renderPasses: Set<RenderPass<{}>>;

    readonly scale = {
        x: 1,
        y: 1
    }
    constructor(public canvas: HTMLCanvasElement, public device: GPUDevice) {
        const context = canvas.getContext('gpupresent');
        if (!context)
            throw ('Unable to get webgpu context')
        this.swapChain = context.configureSwapChain({
            device: device,
            format: "bgra8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        })
        //Scene layoyt is iterated manually so remove it not to iterate it twise.
        //this.rootCameralayout.subBindGroups.delete(this.rootSceneLayout);

        //water color { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }

        this.renderPasses = new Set([this.renderPassCanvas, this.renderPassScreen, this.renderPassWater]);
        //[this.renderPassCanvas, this.renderPassScreen, this.renderPassWater] = renderPasses;
        const canvasSampler = device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });
        this.BindGroupCanvas = (renderPass: RenderPass<{}>) => this.createBindGroupForRenderPass(this.#BindGroupLayoutCanvas, renderPass,
            [{
                binding: 0,
                resource: canvasSampler
            },
            {
                binding: 1,
                resource: this.renderPassScreen.renderTargets.gRenderTargetNormals
            },
            {
                binding: 2,
                resource: this.renderPassScreen.renderTargets.gRenderTargetPositions
            },
            {
                binding: 3,
                resource: this.renderPassScreen.renderTargets.gRenderTargetDiffuse
            },
            {
                binding: 4,
                resource: {
                    buffer: this.GPUData
                }
            }]
        );




        this.#DynamicBindGroups.add(this.BindGroupPosition);
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
    drawBindGroups(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, bgt: PipelineLayout, renderPass: RenderPass<{}>, index: number) {
        let drawedMeshes = 0;
        if (bgt.renderPipeLines.size || bgt.subBindGroups.size) {
            if (bgt.sharedBindgroup && this.#DynamicBindGroups.has(bgt.sharedBindgroup)) {
                bgt.renderPipeLines.forEach(renderPipeline => {
                    renderPassEncoder.setBindGroup(index, bgt.sharedBindgroup!, renderPipeline.dynamicBindGroupOffset.map(o => o * TerraNodeGPU.alignment));
                    drawedMeshes += renderPipeline.draw(renderPassEncoder, renderPass, index);
                });
            }
            else {
                if (bgt.sharedBindgroup) {
                    renderPassEncoder.setBindGroup(index, bgt.sharedBindgroup);
                }
                bgt.renderPipeLines.forEach(m => {
                    drawedMeshes += m.draw(renderPassEncoder, renderPass, index)
                });
            }
            if (bgt.subBindGroups.size) {
                bgt.subBindGroups.forEach((bgt) => { drawedMeshes += this.drawBindGroups(renderPassEncoder, bgt, renderPass, ++index) });
            }
        }
        return drawedMeshes;
    }
    //Without shared bindgroups
    drawBindGroups2(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, bgt: PipelineLayout, renderPass: RenderPass<{}>, index: number) {
        let drawedMeshes = 0;
        if (bgt.renderPipeLines.size || bgt.subBindGroups.size) {
            bgt.renderPipeLines.forEach(m => {
                drawedMeshes += m.draw(renderPassEncoder, renderPass, index)
            });
            if (bgt.subBindGroups.size) {
                bgt.subBindGroups.forEach((bgt) => { drawedMeshes += this.drawBindGroups(renderPassEncoder, bgt, renderPass, ++index) });
            }
        }
        return drawedMeshes;
    }
}