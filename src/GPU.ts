import { MainNode } from "./MainNode.js";
import { PickableRenderPass, RenderPass } from "./GPU/RenderPass.js";
import { LayoutGroupDrawable, PipelineLayout } from "./GPU/PipelineLayout.js";
import { RenderTarget } from "./GPU/RenderTarget.js";
import { BindGroupLayout } from "./GPU/BindGroupLayout.js";
import {Texture } from "./GPU/texture.js";
import type { Projection } from "./GPU/Projection.js";

export const GPUBufferUsage = {
    MAP_READ: 0x0001,
    MAP_WRITE: 0x0002,
    COPY_SRC: 0x0004,
    COPY_DST: 0x0008,
    INDEX: 0x0010,
    VERTEX: 0x0020,
    UNIFORM: 0x0040,
    STORAGE: 0x0080,
    INDIRECT: 0x0100,
    QUERY_RESOLVE: 0x0200
} as const

type CopyBuffers<T> = {
    [K in keyof T]: (GPUMapReadBuffer & GPUCopyDSTBuffer)
};

export class GPU {
    readonly gpu_memory_index_size=256;
    readonly gpu_screen_buffer_size= 16; //screen width and height and ratio
    readonly gpu_max_point_lights=63;

    readonly #bufferSizes: WeakMap<GPUBuffer, number> = new WeakMap();
    readonly GPUBindGroupLayouts: WeakMap<GPUBindGroup, BindGroupLayout<GPUBindGroupEntry[]>> = new WeakMap();
    readonly #DynamicBindGroups: WeakSet<GPUBindGroup> = new WeakSet();

    readonly onRenders2: (() => (GPUCommandBuffer | null))[] = []
    readonly pendingCommandBuffers: Set<GPUCommandBuffer> = new Set();
    readonly tempGPUBuffers: Set<GPUBuffer> = new Set();
    
    readonly rootCameralayout:PipelineLayout;

    projections: Set<Projection> = new Set();
    
    //Todo: Remove COPY_SRC
    readonly GPUMeshes: GPUUniformBuffer & GPUCopyDSTBuffer & GPUStorageBuffer & GPUCopySRCBuffer;
    readonly GPUPointLights: GPUStorageBuffer & GPUCopyDSTBuffer;
    readonly GPUDirectionalLights: GPUStorageBuffer & GPUCopyDSTBuffer;
    readonly rootLayout:PipelineLayout;
    readonly positionBindGroupTimeWGSL:LayoutGroupDrawable<[GPUBindGroupEntry]>;


    readonly uniformBindGroupLayoutLightsWGSL2 : BindGroupLayout<[GPUBindGroupEntry]>;

    readonly lightsBindGroupTexture2 : LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry]>;

    readonly BindGroupPosition:GPUBindGroup;
    readonly positionBindGroupTime:PipelineLayout;
    readonly timeGroup: { binding: number; resource: { buffer: GPUUniformBuffer & GPUCopyDSTBuffer; }; };
    readonly timeBuffer: GPUUniformBuffer & GPUCopyDSTBuffer;

    readonly BindGroupCanvas: (renderPass: RenderPass) => GPUBindGroup;
    static instance: GPU;

    readonly renderPasses: Set<RenderPass<1|4>>;

    readonly scale = {
        x: 1,
        y: 1
    }
    readonly renderPassScreen: PickableRenderPass<1,{
        gRenderTargetNormals: RenderTarget<Texture<"rgba32float", ["RENDER_ATTACHMENT", "TEXTURE_BINDING", "COPY_SRC"],1>>;
        gRenderTargetDiffuse: RenderTarget<Texture<"bgra8unorm", ["RENDER_ATTACHMENT", "TEXTURE_BINDING"],1>>;
    }>;
    
    readonly renderPassWater: RenderPass<1,{
        normals: RenderTarget<Texture<"rgba32float",['RENDER_ATTACHMENT', 'TEXTURE_BINDING'],1>>;
        diffuse: RenderTarget<Texture<"bgra8unorm", ['RENDER_ATTACHMENT', 'TEXTURE_BINDING'],1>>;
    }>;

    readonly renderPassCanvas: RenderPass<1,{ swap: RenderTarget<Texture<'bgra8unorm',['RENDER_ATTACHMENT'],1>>; }>;
    context: GPUCanvasContext;
    updateViewPipeline:TerraGPUComputePipeLine;
    updateViewBindGroup: GPUBindGroup;
    readonly clustersInRow:[number,number,number]=[32, 18, 48];

    readonly clusterSizeinBytes: number;


    readonly CLUSTER_WORKGROUP_SIZE:[number,number,number] = [4, 2, 4];
    readonly CLUSTER_DISPATCH_SIZE:[number,number,number] = this.clustersInRow.map((v,i) => Math.ceil(v/this.CLUSTER_WORKGROUP_SIZE[i]!)) as [number,number,number];
   // readonly CLUSTER_DISPATCH_SIZE:[number,number,number] = [1,1,1];
    viewUniformsLayout: GPUBindGroupLayout;
    readonly uniformBindGroupLayoutWithTime: BindGroupLayout<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>;
    constructor(public canvas: HTMLCanvasElement, public device: GPUDevice, readonly shaderModules: Map<string, GPUShaderModule>) {

        const totalClusters=this.clustersInRow[0] * this.clustersInRow[1] * this.clustersInRow[2]
        this.clusterSizeinBytes= totalClusters * (8 + 64) * Uint32Array.BYTES_PER_ELEMENT;
        const viewLayout=BindGroupLayout.create(this,'view',
            {
                binding:0,
                visibility:GPUShaderStage.COMPUTE,
                buffer: {
                    type:'read-only-storage'
                }
            },
            {
                binding:1,
                visibility:GPUShaderStage.COMPUTE,
                buffer: {
                    type:'read-only-storage'
                }
            },
            {
                binding:2,
                visibility:GPUShaderStage.COMPUTE,
                buffer: {
                    type:'read-only-storage'
                }
            }
        )
        this.viewUniformsLayout= this.device.createBindGroupLayout({
            entries: [
                {
                    binding:0,
                    visibility:GPUShaderStage.COMPUTE,
                    buffer: {
                        type:'storage'
                    }
                },
                {
                    binding:1,
                    visibility:GPUShaderStage.COMPUTE,
                    buffer: {
                        type:'uniform'
                    }
                }
            ]
        });
        this.updateViewPipeline=this.createComputePipeline('updateView.comp.wgsl',
            this.device.createPipelineLayout({bindGroupLayouts:[viewLayout.layout, this.viewUniformsLayout]}));


        this.GPUMeshes = this.createGPUBuffer(MainNode.alignment /* meshes count etc */ + MainNode.alignment * MainNode.maxInstances, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC]);
        this.GPUPointLights = this.createGPUBuffer(this.gpu_max_point_lights*4,[GPUBufferUsage.UNIFORM,GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST])
        this.GPUDirectionalLights = this.createGPUBuffer(63*4,[GPUBufferUsage.UNIFORM,GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST])
        
        
        this.updateViewBindGroup=viewLayout.createBindGroup([{
            binding: 0,
            resource: {
                buffer: this.GPUMeshes,
            },
        },
        {
            binding: 1,
            resource: {
                buffer: this.GPUPointLights,
            },
        },
        {
            binding: 2,
            resource: {
                buffer: this.GPUDirectionalLights,
            },
        }]);
        this.uniformBindGroupLayoutWithTime  = BindGroupLayout.create(this,
            'uniformBindGroupLayoutWithTime',
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
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
            },
            {
                binding: 2, //clusters
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'read-only-storage'
                }
            },
            {   //dimensions
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform"
                }
            },
            {   // mesh array for lights
                binding: 4,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "read-only-storage"
                }
            },
            {   //projection
                binding: 5,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform"
                }
            });
        this.rootCameralayout = new PipelineLayout('rootCamera', this, this.uniformBindGroupLayoutWithTime, undefined, undefined, false, true);

        this.uniformBindGroupLayoutLightsWGSL2 = BindGroupLayout.create(this,'uniformBindGroupLayoutLightsWGSL2',
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform"
                }
            }
        );
        const BindGroupLayoutCanvas = BindGroupLayout.create(this,'BindGroupLayoutCanvas',
            {   //diffuse
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                }
            }, {    //meshes
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "read-only-storage"
                }
            }
        );
        this.rootLayout = new PipelineLayout('rootLayout', this, BindGroupLayoutCanvas);
        const BindGroupLayoutPosition= BindGroupLayout.create(this,
            'BindGroupLayoutPosition',
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform",
                    hasDynamicOffset: true
                }
            }
        );
        this.BindGroupPosition = BindGroupLayoutPosition.createBindGroup([
            {
                binding: 0,
                resource: {
                    buffer: this.GPUMeshes,
                    offset: 0,
                    size: MainNode.GPUDataSize * 4
                }
            }]);
        this.positionBindGroupTime = this.rootCameralayout.addChildBindGroup('positionBindGroupTime', this.BindGroupPosition, true);

        this.positionBindGroupTimeWGSL = this.rootCameralayout.addChildLayout('positionBindGroupTimeWGSL', BindGroupLayoutPosition);
        this.lightsBindGroupTexture2 = this.positionBindGroupTimeWGSL.addChildLayout('lightsBindGroupTexture2', BindGroupLayout.create(this,
        'lightsBindGroupTexture2',
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                },
            }, {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {}
            }
        ));
        const normalAndPositionTexture = Texture.create(this,"rgba32float",['RENDER_ATTACHMENT', 'TEXTURE_BINDING','COPY_SRC'],[300,300,1])
        const diffuseTexture = Texture.create(this,"bgra8unorm",['RENDER_ATTACHMENT', 'TEXTURE_BINDING'])
        this.renderPassScreen = new PickableRenderPass(this, {
            gRenderTargetNormals: new RenderTarget(normalAndPositionTexture, { r: 0.0, g: 1.0, b: 0.0, a: 1.0 },{ baseArrayLayer: 0, arrayLayerCount: 1 }),
            gRenderTargetDiffuse: new RenderTarget(diffuseTexture, { r: 0.53, g: 0.8, b: 0.92, a: 0.0 })
        }, 1, true, [canvas.width,canvas.height,1],
            (w, h) => {
                return [w, h]
            });
        const normalTextureWater = Texture.create(this,"rgba32float",['RENDER_ATTACHMENT', 'TEXTURE_BINDING'])
        const diffuseTextureWater = Texture.create(this,"bgra8unorm",['RENDER_ATTACHMENT', 'TEXTURE_BINDING'])
    
        this.renderPassWater = new RenderPass(this, {
            normals: new RenderTarget(normalTextureWater, { r: 0.0, g: 1.0, b: 0.0, a: 1.0 }),
            diffuse: new RenderTarget(diffuseTextureWater, { r: 0.023, g: 0.25, b: 0.45, a: 1.0 })
        }, 1, true, [canvas.width,canvas.height,1], (w, h) => [w >> 2, h >> 2]);
      
        const canvasTexture = Texture.create(this,"bgra8unorm",['RENDER_ATTACHMENT'])

        this.renderPassCanvas = new RenderPass(this, {
            swap: new RenderTarget(canvasTexture, { r: 0.53, g: 0.8, b: 0.92, a: 1.0 })
        }, 1, false, [canvas.width,canvas.height,1],
            (w, h) => {
                return [w, h]
            });
        const context:GPUCanvasContext | null = canvas.getContext('webgpu');
        if (!context)
            throw ('Unable to get webgpu context');
        this.context = context

        context.configure({
            device: device,
            format: "bgra8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        })
        //Scene layoyt is iterated manually so remove it not to iterate it twise.
        //this.rootCameralayout.subBindGroups.delete(this.rootSceneLayout);

        //water color { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }

        this.renderPasses = new Set([this.renderPassCanvas, this.renderPassScreen, this.renderPassWater]);
        //[this.renderPassCanvas, this.renderPassScreen, this.renderPassWater] = renderPasses;

        this.BindGroupCanvas = (renderPass: RenderPass) =>  {
            return BindGroupLayoutCanvas.createBindGroupForRenderPass(renderPass,
            [
            {
                binding: 0,
                resource: this.renderPassScreen.renderTargets.gRenderTargetDiffuse
            },
            {
                binding: 1,
                resource: {
                    buffer: this.GPUMeshes
                }
            }
            ]
        );
        }
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
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.UNIFORM], mappedAtCreation?: boolean): GPUUniformBuffer
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.UNIFORM | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUUniformBuffer & GPUStorageBuffer
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
    createGPUBuffer(size: number, uusages: [typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.STORAGE, typeof GPUBufferUsage.VERTEX | typeof GPUBufferUsage.STORAGE], mappedAtCreation?: boolean): GPUVertexBuffer & GPUStorageBuffer
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
    createGPUBuffer(size: number, usages:[
        typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.VERTEX,
        typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.VERTEX,
        typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.VERTEX,
        typeof GPUBufferUsage.STORAGE | typeof GPUBufferUsage.COPY_DST | typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.VERTEX], mappedAtCreation?: boolean): GPUStorageBuffer & GPUCopyDSTBuffer & GPUCopySRCBuffer & GPUVertexBuffer

    //MAP read (Only CopyDst is allowed with MapRead)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST, typeof GPUBufferUsage.MAP_READ | typeof GPUBufferUsage.COPY_DST], mappedAtCreation?: boolean): GPUMapReadBuffer & GPUCopyDSTBuffer

    //MAP write (Only CopySrc is allowed with MapWrite)
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.MAP_WRITE, typeof GPUBufferUsage.COPY_SRC | typeof GPUBufferUsage.MAP_WRITE], mappedAtCreation?: boolean): GPUMapWriteBuffer & GPUCopySRCBuffer
    //copy source for mapped at creation
    createGPUBuffer(size: number, usages: [typeof GPUBufferUsage.COPY_SRC], mappedAtCreation?: boolean): GPUCopySRCBuffer


    createGPUBuffer(size: number, usages: number[], mappedAtCreation = false): GPUBuffer {
        if (size === 0)
            throw (new Error('Cannot create zero sized buffer'));
        const usage = usages.reduce((prev, curr) => prev | curr, 0);
        const buff = this.device.createBuffer({ usage, size, mappedAtCreation });

        if (usage & GPUBufferUsage.MAP_READ) {
            (buff as GPUMapReadBuffer).readAndDestroy = (callback: (buff: ArrayBuffer) => void): Promise<void> => {
                return buff.mapAsync(GPUMapMode.READ).then(() => {
                    const arrbuff = buff.getMappedRange();
                    callback(arrbuff);
                    buff.destroy();
                });
            }
        }
        else if (usage & GPUBufferUsage.COPY_SRC)
            this.#bufferSizes.set(buff, size);
        return buff;
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
            compute: {
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
    drawBindGroups(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, bgt: PipelineLayout, renderPass: RenderPass, index: number) {
        let drawedMeshes = 0;
        if (bgt.renderPipeLines.size || bgt.subBindGroups.size) {
            if (bgt.sharedBindgroup && this.#DynamicBindGroups.has(bgt.sharedBindgroup)) {
                bgt.renderPipeLines.forEach(renderPipeline => {
                    renderPassEncoder.setBindGroup(index, bgt.sharedBindgroup!, renderPipeline.dynamicBindGroupOffset.map(o => o * MainNode.alignment));
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
    drawBindGroups2(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, pipelineLayout: PipelineLayout, renderPass: RenderPass, index: number, dynamicIndices: number[] = []) {
        let drawedMeshes = 0;
        if (pipelineLayout.renderPipeLines.size || pipelineLayout.subBindGroups.size) {

            if (pipelineLayout.bindGroupLayout.dynamicIndices) {
                dynamicIndices.push(index);

            }

            pipelineLayout.renderPipeLines.forEach(renderpipeline => {
                drawedMeshes += renderpipeline.draw(renderPassEncoder, renderPass, index, dynamicIndices)
            });
            if (pipelineLayout.subBindGroups.size) {
                pipelineLayout.subBindGroups.forEach((subPipelineLayot) => {
                    /*subPipelineLayot.renderPipeLines.forEach(renderPipeline => {
                        drawedMeshes += renderPipeline.draw(renderPassEncoder, renderPass, index + dynamicIndices.length, dynamicIndices);
                    });*/
                    drawedMeshes += this.drawBindGroups2(renderPassEncoder, subPipelineLayot, renderPass, pipelineLayout.bindGroupLayout.dynamicIndices?index:++index, dynamicIndices)
                    
                });
            }
        }
        return drawedMeshes;
    }
}