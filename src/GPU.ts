import { RenderPass } from "./GPU/RenderPasses/RenderPass.js";
import { PickableRenderPass } from "./GPU/RenderPasses/PickableRenderPass.js";

import { type LayoutGroupDrawable, PipelineLayout } from "./GPU/PipelineLayout.js";
import { ColorRenderTarget } from "./GPU/RenderTargets/ColorRenderTarget.js";
import { BindGroupLayout, type GPUBindGroupTextureEntry } from "./GPU/BindGroupLayout.js";
import type { Projection } from "./GPU/Projection.js";
import shaders from "./shaders.json" assert { type: "json" };
import { MSAARenderTarget } from "./GPU/RenderTargets/MSAARenderTarget.js";
import { RenderPipeline, Shader, VertexShader } from "./GPU/RenderPipeline.js";
import { ComputePipeline } from "./GPU/ComputePipeline.js";
import type { BindGroup } from "./GPU/BindGroup.js";
import { BindStorageBuffer, BindUniformBuffer, Buffer, CopyDstBuffer, CopySrcBuffer, GPUBufferUsage } from "./GPU/Buffer.js";

import type { Engine, } from "./engine.js";
import { Uint16Vector2 } from "./Math.js";
import { DepthRenderTarget } from "./GPU/RenderTargets/DepthRenderTarget.js";
import { DepthRenderPass } from "./GPU/RenderPasses/DepthRenderPass.js";
import { TerraCamera } from "./TerraCamera.js";
import { TextureUsageEnums, TextureUsageType } from "./GPU/Texture.js";
declare const engine: Engine;

let curSecond = 0;
let framecount = 0;


// Cluster debug
/*

let debugNumber=0;
//@ts-ignore
window.resetDebugNumber = () => {
    debugNumber = 0;
}
*/
export class GPU {
    #maxInstances = 10;

    readonly #mousePositionBuffer = new SharedArrayBuffer(4);
    readonly mousePosition = new Uint16Vector2(this.#mousePositionBuffer);


    static readonly gpu_memory_index_size = 256;
    readonly gpu_screen_buffer_size = 16; //screen width and height and ratio
    readonly gpu_max_point_lights = 63;

    readonly #DynamicBindGroups: WeakSet<BindGroup> = new WeakSet();

    readonly pendingCommandBuffers: Set<GPUCommandBuffer> = new Set();
    readonly tempGPUBuffers: GPUBuffer[] = [];

    readonly rootCameralayout: PipelineLayout;

    readonly projections: Set<Projection> = new Set();
    readonly cameras: TerraCamera[] = []

    //Todo: Remove COPY_SRC
    readonly GPUMeshes: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer & BindUniformBuffer
    readonly #GPUPointLights: CopyDstBuffer & BindStorageBuffer & BindUniformBuffer;
    readonly #GPUDirectionalLights: CopyDstBuffer & BindStorageBuffer
    readonly positionBindGroupTimeWGSL: LayoutGroupDrawable<[GPUBindGroupEntry]>;

    readonly lightsBindGroupTexture2: LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry]>;

    readonly BindGroupPosition: BindGroup;
    readonly timeBuffer: CopyDstBuffer & BindUniformBuffer

    readonly #renderPasses: RenderPass[];

    readonly #scale = {
        x: 1,
        y: 1
    }
    readonly renderPassScreen: PickableRenderPass<{
        gRenderTargetDiffuse: MSAARenderTarget<"bgra8unorm", TextureUsageType["RENDER_ATTACHMENT|TEXTURE_BINDING"]>;
    }>;

    readonly renderPassWater: DepthRenderPass<{
        diffuse: ColorRenderTarget<"bgra8unorm", TextureUsageType["RENDER_ATTACHMENT|TEXTURE_BINDING"]>;
    }>;
    readonly renderPassCanvas: RenderPass<{ swap: ColorRenderTarget<GPUTextureFormat, TextureUsageType["RENDER_ATTACHMENT"]>; }>;

    updateViewPipeline: ComputePipeline;
    readonly #updateViewBindGroup: BindGroup;
    readonly clustersInRow: [number, number, number] = [32, 18, 48];

    readonly clusterSizeinBytes: number;


    readonly #CLUSTER_WORKGROUP_SIZE: [number, number, number] = [4, 2, 4];
    readonly CLUSTER_DISPATCH_SIZE: [number, number, number] = this.clustersInRow.map((v, i) => Math.ceil(v / this.#CLUSTER_WORKGROUP_SIZE[i]!)) as [number, number, number];
    // readonly CLUSTER_DISPATCH_SIZE:[number,number,number] = [1,1,1];
    readonly viewUniformsLayout: BindGroupLayout;
    readonly uniformBindGroupLayoutWithTime: BindGroupLayout<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>;
    readonly #presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    readonly shaderModules = {} as { [K in keyof typeof shaders]: GPUShaderModule }
    readonly pickRenderPass: RenderPass<{ gRenderTargetId: ColorRenderTarget<"r32uint", TextureUsageType["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC"]>; }>;
    readonly sizeBindGroupLayout: BindGroupLayout<[GPUBindGroupEntry]>;
    static readonly #renderPipelines: Map<string, RenderPipeline> = new Map();
    readonly bindGroupTextureWater: LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupTextureEntry<unknown>]>;
    ro: ResizeObserver;
    canvasRootLayout: PipelineLayout;
    UIPipeline: RenderPipeline<VertexShader<[{
        arrayStride: number; stepMode: "vertex"; attributes: {
            // position
            shaderLocation: number; offset: number; format: "float32x2";
        }[];
    }]>>;
    createRenderPipeline<R extends RenderPipeline>(desc: readonly [label: string, create: (gpu: GPU, hash: string, primitive: GPUPrimitiveState) => R], primitive: GPUPrimitiveState & { topology: 'triangle-strip' | 'line-strip', stripIndexFormat: GPUIndexFormat }): R
    createRenderPipeline<R extends RenderPipeline>(desc: readonly [label: string, create: (gpu: GPU, hash: string, primitive: GPUPrimitiveState) => R], primitive: Omit<GPUPrimitiveState, 'stripIndexFormat'> & { topology: 'triangle-list' | 'line-list' }): R
    createRenderPipeline<R extends RenderPipeline>(desc: readonly [label: string, create: (gpu: GPU, hash: string, primitive: GPUPrimitiveState) => R], primitive?: Omit<GPUPrimitiveState, 'topology'>): R
    createRenderPipeline<R extends RenderPipeline>(desc: readonly [label: string, create: (gpu: GPU, hash: string, primitive: GPUPrimitiveState) => R], primitive: GPUPrimitiveState = {}): R {
        const primitiveWithDefaults: GPUPrimitiveState = {
            topology: 'triangle-list',
            frontFace: 'cw',
            cullMode: 'back',
            ...primitive
        }
        const hash = desc[0] + Object.values(primitiveWithDefaults).sort().join();
        let renderPipeline = GPU.#renderPipelines.get(hash);
        if (!renderPipeline) {
            renderPipeline = desc[1](this, hash, primitiveWithDefaults);
            if (renderPipeline)
                GPU.#renderPipelines.set(hash, renderPipeline);
        }
        //@ts-expect-error Bug in TS?
        return renderPipeline;

    }
    #GPUQueueCommandEncoder: GPUCommandEncoder | null = null;
    #renderFrame = 0;
    destroy(newGPU: Promise<GPU>) {
        // eslint-disable-next-line promise/catch-or-return
        newGPU.then(gpu => {
            this.cameras.forEach(camera => {
                camera.initForGPU(gpu.renderPassScreen, gpu, camera.projection!);
            })
        })
        this.ro.disconnect();
        cancelAnimationFrame(this.#renderFrame);
    }
    constructor(
        public canvas: HTMLCanvasElement,
        public device: GPUDevice,
        private GPUDataSizeBytes: number) {
        for (const key in shaders) {
            const k = key as keyof typeof shaders;
            this.shaderModules[k] = device.createShaderModule({ code: shaders[k], label: k });
        }
        const totalClusters = this.clustersInRow[0] * this.clustersInRow[1] * this.clustersInRow[2]
        this.clusterSizeinBytes = totalClusters * (8 + 64) * Uint32Array.BYTES_PER_ELEMENT;
        const viewLayout = BindGroupLayout.create(this, 'view',
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage'
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage'
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage'
                }
            }
        )
        this.viewUniformsLayout = new BindGroupLayout(this, this.device.createBindGroupLayout({
            label: 'viewUniformsLayout',
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'storage'
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform'
                    }
                }
            ]
        }))
        this.updateViewPipeline = new ComputePipeline(this, 'updateView.comp.wgsl',
            this.device.createPipelineLayout({ bindGroupLayouts: [viewLayout.layout, this.viewUniformsLayout.layout] }));
        this.GPUMeshes = Buffer.create(this, GPU.gpu_memory_index_size /* meshes count etc */ + GPU.gpu_memory_index_size * this.#maxInstances, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC], 'GPUMeshes')
        this.#GPUPointLights = Buffer.create(this, this.gpu_max_point_lights * 4, [GPUBufferUsage.UNIFORM, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST], 'GPUPointLights')
        this.#GPUDirectionalLights = Buffer.create(this, 63 * 4, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST], 'GPUDirectionalLights')


        this.#updateViewBindGroup = viewLayout.createBindGroup('updateViewBindGroup', bindGroup => [{
            binding: 0,
            resource: this.GPUMeshes.getStorageBinding(bindGroup),
        },
        {
            binding: 1,
            resource: this.#GPUPointLights.getStorageBinding(bindGroup),
        },
        {
            binding: 2,
            resource: this.#GPUDirectionalLights.getStorageBinding(bindGroup),
        }]);
        this.uniformBindGroupLayoutWithTime = BindGroupLayout.create(this,
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
            {   // mesh array for lights
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "read-only-storage"
                }
            },
            {   //projection
                binding: 4,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform"
                }
            });
        this.sizeBindGroupLayout = BindGroupLayout.create(this, 'sizeBindGroupLayout', {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: { type: 'uniform' }
        })
        const sizePipelineLayout = new PipelineLayout({
            label: 'renderPass',
            bindGroupLayout: this.sizeBindGroupLayout
        });

        this.rootCameralayout = new PipelineLayout({
            label: 'rootCamera',
            bindGroupLayout: this.uniformBindGroupLayoutWithTime,
            parent: sizePipelineLayout
        });

        const BindGroupLayoutPosition = BindGroupLayout.create(this,
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
        this.BindGroupPosition = BindGroupLayoutPosition.createBindGroup('BindGroupPosition', bindGroup => [
            {
                binding: 0,
                resource: this.GPUMeshes.getUniformBinding(bindGroup, 0, GPU.gpu_memory_index_size)
            }]);
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
        this.bindGroupTextureWater = this.positionBindGroupTimeWGSL.addChildLayout('water', BindGroupLayout.create(
            this,
            'water',
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    type: 'non-filtering'
                }
            }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {

            }
        }
        ));

        this.pickRenderPass = new RenderPass({
            gpu: this,
            colorRenderTargets: {
                gRenderTargetId: new ColorRenderTarget(
                    {
                        gpu: this,
                        format: "r32uint",
                        usages: TextureUsageEnums["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC"],
                        label: 'idTexture',
                        size: { width: 300, height: 300 }
                    },
                    {
                        writeMask: 0xF,
                        textureViewDescriptor: { baseArrayLayer: 0, arrayLayerCount: 1 },
                        context: undefined
                    }, {
                    clearValue: { r: 0.0, g: 1.0, b: 0.0, a: 1.0 },
                    blend: undefined
                })
            },
            sampleCount: 1,
            size: { width: canvas.width, height: canvas.height },
            getSizeOnResize: (w, h) => {
                return [w, h]
            },
            entryPoint: 'pick',
            rootLayout: this.rootCameralayout,
            label: 'pickRenderPass'
        }
        );

        this.renderPassScreen = new PickableRenderPass(
            {
                gpu: this,
                colorRenderTargets: {
                    gRenderTargetDiffuse: new MSAARenderTarget({
                        gpu: this,
                        format: "bgra8unorm",
                        usages: TextureUsageEnums["RENDER_ATTACHMENT|TEXTURE_BINDING"],
                        label: 'diffuseTexture',
                        size: { width: 300, height: 300 }
                    },
                        {
                            writeMask: 0xF,
                            textureViewDescriptor: undefined,
                            context: undefined
                        },
                        {
                            clearValue: { r: 0.53, g: 0.8, b: 0.92, a: 0.0 },
                            blend: undefined,
                        }),
                },
                sampleCount: 4,
                size: { width: canvas.width, height: canvas.height },
                getSizeOnResize: (w, h) => {
                    return [w, h]
                },
                entryPoint: 'main',
                rootLayout: this.rootCameralayout,
                label: 'renderPassScreen'
            },
            new DepthRenderTarget(0, {
                format: 'depth32float',
                usages: TextureUsageEnums["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC"],
                label: 'depthTexture_renderPassScreen',
                initialSampleCount: 4,
                size: { width: 300, height: 300 },
                gpu: this
            },
                {
                    writeMask: 0xF,
                    context: undefined,
                    textureViewDescriptor: undefined
                })
        );

        this.renderPassWater = new DepthRenderPass(
            {
                gpu: this,
                colorRenderTargets: {
                    diffuse: new ColorRenderTarget(
                        {
                            gpu: this,
                            format: "bgra8unorm",
                            usages: TextureUsageEnums["RENDER_ATTACHMENT|TEXTURE_BINDING"],
                            label: 'diffuseTextureWater',
                            size: { width: 300, height: 300 }
                        }, {
                        textureViewDescriptor: undefined,
                        writeMask: 0xF,
                        context: undefined
                    },
                        {
                            clearValue: { r: 0.023, g: 0.25, b: 0.45, a: 1.0 },
                            blend: undefined
                        }),
                },
                sampleCount: 1,
                size: { width: canvas.width, height: canvas.height },
                getSizeOnResize: (w, h) => [w >> 2, h >> 2],
                entryPoint: 'main',
                rootLayout: this.rootCameralayout,
                label: 'renderPassWater'
            },
            new DepthRenderTarget(0, {
                format: 'depth32float',
                usages: TextureUsageEnums["RENDER_ATTACHMENT|COPY_SRC"],
                label: 'depthTexture_renderPassWater',
                size: { width: 300, height: 300 },
                initialSampleCount: 1,
                gpu: this
            }, {
                writeMask: 0xF,
                context: undefined,
                textureViewDescriptor: undefined
            })
        );

        //TODO: this does not need to be canvas size
        /*const renderPassShadows = new DepthRenderPass(this, {}, 4, [canvas.width,canvas.height,1],
            (w, h) => [w, h],'shadows',this.rootCameralayout,'renderPassShadows');
    */

        const context: GPUCanvasContext | null = canvas.getContext('webgpu') as unknown as GPUCanvasContext; // unknown for jest
        if (!context)
            throw (new Error('Unable to get webgpu context'));

        context.configure({
            device: device,
            format: this.#presentationFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        const BindGroupLayoutCanvas = BindGroupLayout.create(this, 'BindGroupLayoutUI',
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform"
                } as GPUBufferBindingLayout
            },
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                } as GPUTextureBindingLayout
            }
        )
        this.canvasRootLayout = new PipelineLayout({
            label: 'canvasRootLayout',
            bindGroupLayout: BindGroupLayoutCanvas
        });

        this.UIPipeline = this.canvasRootLayout.addRenderPipeline('UIRenderPipeline',
        new VertexShader(this, 'deferred/UI.vert.wgsl', [
            {
                arrayStride: 4 * 4,
                stepMode: "vertex",
                attributes: [{
                    // position
                    shaderLocation: 0,
                    offset: 0,
                    format: "float32x2",
                },
                {
                    // uv
                    shaderLocation: 1,
                    offset: 8,
                    format: "float32x2",
                }]
            }
        ]),
        new Shader(this, 'deferred/UI.frag.wgsl'),{
        primitive: {
            topology: 'triangle-list',
            frontFace: 'ccw'
        },
    });

        this.renderPassCanvas = new RenderPass({
            gpu: this,
            colorRenderTargets: {
                swap: new ColorRenderTarget({
                    gpu: this,
                    format: this.#presentationFormat,
                    usages: TextureUsageEnums.RENDER_ATTACHMENT,
                    label: 'canvasTexture',
                    size: { width: 300, height: 300 }
                }, {
                    context: context,
                    writeMask: 0xF,
                    textureViewDescriptor: undefined
                },
                    {
                        clearValue: { r: 0.53, g: 0.8, b: 0.92, a: 1.0 },
                        blend: {
                            alpha: {
                                operation: 'add',
                                srcFactor: 'one',
                                dstFactor: 'one-minus-src-alpha'
                            },
                            color: {
                                operation: 'add',
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha'
                            }
                        }
                    })
            },
            sampleCount: 1,
            size: { width: canvas.width, height: canvas.height },
            getSizeOnResize: (w, h) => {
                return [w, h]
            },
            entryPoint: 'main',
            rootLayout: this.canvasRootLayout,
            label: 'renderPassCanvas'
        });

        //Scene layoyt is iterated manually so remove it not to iterate it twise.
        //this.rootCameralayout.subBindGroups.delete(this.rootSceneLayout);

        //water color { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }

        this.#renderPasses = [this.renderPassCanvas, this.renderPassScreen, this.renderPassWater, this.pickRenderPass];


        this.#DynamicBindGroups.add(this.BindGroupPosition);
        const timeAndDeltaBuffer = new ArrayBuffer(8);
        this.timeBuffer = Buffer.create(this, timeAndDeltaBuffer.byteLength, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST], 'timeBuffer');

        const computePipelineClustersLayout = new BindGroupLayout(this, {
            label: 'computePipelineClustersLayout', entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'storage'
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform'
                    }
                }
            ]
        })
        const computePipelineClusters = new ComputePipeline(this, 'clusters.comp.wgsl',
            this.device.createPipelineLayout({
                bindGroupLayouts: [this.sizeBindGroupLayout.layout, computePipelineClustersLayout.layout]
            }));
        let resizeHandler: null | ReturnType<typeof setTimeout> = null;
        const maxResolution = {
            width: 1920,
            height: 1080
        }
        this.ro = new window.ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry)
                return;
            window.cancelAnimationFrame(this.#renderFrame)
            resizeHandler && clearTimeout(resizeHandler);
            resizeHandler = setTimeout(() => {
                try {
                    const aspectRatio = entry.contentRect.width / entry.contentRect.height
                    canvas.width = Math.min((entry.contentRect.width | 0) * window.devicePixelRatio, maxResolution.width);

                    canvas.height = canvas.width / aspectRatio

                    if (canvas.height > maxResolution.height) {
                        canvas.height = maxResolution.height;
                        canvas.width = canvas.height * aspectRatio;
                    }

                    this.#scale.x = canvas.width / entry.contentRect.width;
                    this.#scale.y = canvas.height / entry.contentRect.height;
                    // configure() must also be called if you want to change the size of the textures returned by getCurrentTexture()
                    context.configure({
                        device: this.device,
                        format: this.#presentationFormat,
                        usage: GPUTextureUsage.RENDER_ATTACHMENT
                    })
                    const commandEncoder = this.device.createCommandEncoder({ label: 'resizeEncoder' });
                    const passEncoder = commandEncoder.beginComputePass({ label: 'resizePassEncoder' });
                    passEncoder.setPipeline(computePipelineClusters.pipeline);

                    this.projections.forEach(projection => projection.update(aspectRatio, this));
                    this.#renderPasses.forEach(renderPass => {
                        renderPass.resize(canvas.width, canvas.height);
                        passEncoder.setBindGroup(0, renderPass.sizeBindGroup().bindGroup);
                        renderPass.perspectiveCameras.forEach(camera => {
                            camera.updateClusters(passEncoder, computePipelineClustersLayout)
                        });
                    });
                    // Call onResize after all renderPasses have resizes so callbacks
                    // can refer updated render target of other renderpasses.
                    this.#renderPasses.forEach(renderPass => {
                        renderPass.onResize.forEach(cb => cb());
                    });
                    passEncoder.end();
                    this.device.queue.submit([commandEncoder.finish()]);
                    this.#renderFrame = window.requestAnimationFrame(this.#renderLoop);
                } catch (e) {
                    engine.showError(e);
                }
            }, 500)
        });
        if (!canvas.parentElement) {
            throw new Error('Canvas must have parent element');
        }
        this.ro.observe(canvas.parentElement);
        canvas.addEventListener('pointermove', (e) => {
            Atomics.store(this.mousePosition, 0, e.clientX * this.#scale.x)
            Atomics.store(this.mousePosition, 1, e.clientY * this.#scale.y)
            Atomics.notify(new Int32Array(this.#mousePositionBuffer), 0);
        });
    }
    readonly #queue_map = new Map<number, number>();

    handle_gpu_queue(pointerVec: number, length: number) {
        this.#GPUQueueCommandEncoder = this.device.createCommandEncoder({ label: 'handle_gpu_queue_encoder' });
        const pointers_to_gpumesh_and_offset = new Uint32Array(engine.memory.buffer, pointerVec, length * 2);
        for (let i = 0; i < pointers_to_gpumesh_and_offset.length; i += 2) {
            const offset = pointers_to_gpumesh_and_offset[i + 1]!;
            this.#queue_map.set(pointers_to_gpumesh_and_offset[i]!, offset);
            if (offset >= this.#maxInstances) {
                this.#maxInstances = offset + 10;
                //  console.log('resize to ',maxInstances)
                //   new Float32Array(engine.memory.buffer, engine.rust.GPUMeshes()+offset*this.GPUDataSizeBytes, offset*256);
                this.GPUMeshes.resize(GPU.gpu_memory_index_size /* meshes count etc */ + GPU.gpu_memory_index_size * this.#maxInstances)
            }
        }
        let tempOffset = 0;

        Buffer.create(this, this.GPUDataSizeBytes * this.#queue_map.size, [GPUBufferUsage.COPY_SRC], 'handle_gpu_queue', (tempBuffer, gpu2) => {
            this.#queue_map.forEach((offset, gpumeshPointer) => {


                const data = new Float32Array(engine.memory.buffer, gpumeshPointer, this.GPUDataSizeBytes / 4);
                //Point light
                if (data[29]! > 0) {
                    engine.updateLights = true;
                }
                new Float32Array(tempBuffer.getMappedRange(tempOffset * this.GPUDataSizeBytes, this.GPUDataSizeBytes)).set(data);
                //  console.log('copy to ',GPU.gpu_memory_index_size + offset * GPU.gpu_memory_index_size, offset)
                gpu2.GPUMeshes.copyFrom(this.#GPUQueueCommandEncoder!, tempBuffer, tempOffset++ * this.GPUDataSizeBytes, GPU.gpu_memory_index_size + offset * GPU.gpu_memory_index_size, this.GPUDataSizeBytes)
            });
            this.#queue_map.clear();
            gpu2.tempGPUBuffers.push(tempBuffer);
        });
    }
    //TODO: Queue this call and do it only once per frame
    updateAllocatedMemory(allocated_gpu_memory_ptr: number, length: number) {
        const renderEncoder = this.device.createCommandEncoder({ label: 'updateAllocatedMemory_encoder' });
        const buffLength = Uint32Array.BYTES_PER_ELEMENT * length;
        const tempBuffer = Buffer.create(this, buffLength, [GPUBufferUsage.COPY_SRC], 'tempBuffer', tempBuffer2 => {
            new Uint32Array(tempBuffer2.getMappedRange(0, buffLength)).set(new Uint32Array(engine.rust.memory.buffer, allocated_gpu_memory_ptr, length));
        });
        tempBuffer.copyTo(renderEncoder, this.GPUMeshes, 0, 0, buffLength);
    }
    update_directional_lights(pointer: number, length: number) {
        const lights = new Uint32Array(engine.memory.buffer, pointer, length);
        const commandEncoder = this.device.createCommandEncoder({ label: 'update_directional_lights_encoder' });
        //TODO: Potential buffer overflow
        const byteLength = 4 + lights.byteLength;
        const tempBuffer = Buffer.create(this, byteLength, [GPUBufferUsage.COPY_SRC], 'directional_lights_tempBuffer', tempBuffer2 => {
            const gpu_buffer = new Uint32Array(tempBuffer2.getMappedRange());
            gpu_buffer[0] = lights.length;
            gpu_buffer.set(lights, 1);
        });
        tempBuffer.copyTo(commandEncoder, this.#GPUDirectionalLights, 0, 0, byteLength);
        this.pendingCommandBuffers.add(commandEncoder.finish());
    }
    update_point_lights(pointer: number, length: number) {
        const lights = new Uint32Array(engine.memory.buffer, pointer, length);
        const commandEncoder = this.device.createCommandEncoder({ label: 'update_point_lights_encoder' });
        //TODO: Potential buffer overflow
        const byteLength = 4 + lights.byteLength;
        const tempBuffer = Buffer.create(this, byteLength, [GPUBufferUsage.COPY_SRC], 'point_lights_tempBuffer', tempBuffer2 => {
            const gpu_buffer = new Uint32Array(tempBuffer2.getMappedRange());
            gpu_buffer[0] = lights.length;
            gpu_buffer.set(lights, 1);
        });
        tempBuffer.copyTo(commandEncoder, this.#GPUPointLights, 0, 0, byteLength);
        this.pendingCommandBuffers.add(commandEncoder.finish());
    }
    readonly timeAndDeltaBuffer = new ArrayBuffer(8);
    readonly deltaView = new Float32Array(this.timeAndDeltaBuffer, 4, 1);
    readonly #timeView = new Uint32Array(this.timeAndDeltaBuffer, 0, 1);
    #renderStarted = false;
    #renderStartedCallbacks:(() => void)[] = []
    afterRenderStart(cb: () => void) {
        if(this.#renderStarted) {
            cb();
        } else {
            this.#renderStartedCallbacks.push(cb);
        }
    }
    readonly #renderLoop = (time: DOMHighResTimeStamp) => {
        //msPerFrame = performance.now() - startTime;
        //startTime = performance.now();

        const nowSecond = (Date.now() / 500) | 0;
        if (nowSecond !== curSecond) {
            //@ts-ignore
            window.fps = framecount * 2;
            curSecond = nowSecond;
            framecount = 0;
        }
        framecount++;
        //performance.mark('renderloopStart');



        this.#GPUQueueCommandEncoder = null;
        engine.rust.renderloop();
        //@ts-ignore bug in TS
        const commandBuff = this.#GPUQueueCommandEncoder?.finish() ?? null;
        if (commandBuff)
            this.pendingCommandBuffers.add(commandBuff);

        if (engine.inputManager?.checkInputs && engine.inputManager?.checkInputs()) {
            if (engine.inputManager.calculateCameraPositionAndTarget)
                engine.inputManager.calculateCameraPositionAndTarget();
        }

        const renderEncoder = this.device.createCommandEncoder({ label: 'renderloop_renderEncoder' });

        this.#timeView.set([time]);
        let physicDelta: number | null;
        if (engine.physics.gameSpeed == -1)
            physicDelta = null;
        else
            physicDelta = (engine.physics.physicTime - engine.physics.tickTime) / ((engine.physics.tickIntervalMs))
        if (physicDelta !== null)
            this.deltaView.set([physicDelta]);
        this.timeBuffer.write(0, this.timeAndDeltaBuffer);

        try {
            engine.cameras.forEach(camera => {
                camera.updateView(renderEncoder)
            })
            const lightPass = renderEncoder.beginComputePass({ label: 'lightPassEncoder' });
            lightPass.setPipeline(this.updateViewPipeline.pipeline);
            lightPass.setBindGroup(0, this.#updateViewBindGroup.bindGroup);
            engine.cameras.forEach(camera => {
                if (camera.viewUpdated || engine.updateLights) {
                    camera.viewUpdated = false;
                    lightPass.setBindGroup(1, camera.updateViewBindGroup!.bindGroup);
                    lightPass.dispatchWorkgroups(...this.CLUSTER_DISPATCH_SIZE);
                }
            });
            lightPass.end();
            // Cluster debug
            //var readBuffer = engine.mainCamera.clusterArrayBuffer?.createReadCopy(renderEncoder)

            engine.updateLights = false;

            this.#renderPasses.forEach(renderPass => {
                renderPass.render(renderEncoder)
            })
        } catch (e) {
            console.error(e);
        }

        this.pendingCommandBuffers.add(renderEncoder.finish())
        this.device.queue.submit(this.pendingCommandBuffers);
        // Cluster debug
        /*
        if(debugNumber === 0) {
            readBuffer?.readAndDestroy((buff) => {
                console.log('clusters',new Uint32Array(buff,8*4 * 27648 + 4 * 27648, 2 ));
            });
            debugNumber=debugNumber+1;
        }*/
        this.pendingCommandBuffers.clear();
        this.tempGPUBuffers.forEach(buff => buff.destroy());
        this.tempGPUBuffers.length = 0;
        if(!this.#renderStarted) {
            this.#renderStartedCallbacks.forEach(cb => cb());
            this.#renderStartedCallbacks.length = 0;
            this.#renderStarted = true;
        }
        this.#renderFrame = window.requestAnimationFrame(this.#renderLoop);
    }
}