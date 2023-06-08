import { RenderPass } from "./GPU/RenderPasses/RenderPass.js";
import { PickableRenderPass } from "./GPU/RenderPasses/PickableRenderPass.js";

import { ColorRenderTarget } from "./GPU/RenderTargets/ColorRenderTarget.js";
import { Projection, PROJECTION_BUFFER_SIZE } from "./GPU/Projection.js";
import { MSAARenderTarget } from "./GPU/RenderTargets/MSAARenderTarget.js";
import type { BindGroup } from "./GPU/BindGroup.js";
import { BindStorageBuffer, BindUniformBuffer, Buffer, CopyDstBuffer, CopySrcBuffer, GPUBufferUsage } from "./GPU/Buffer/Buffer.js";

import type { Engine, } from "./engine.js";
import { Uint16Vector2 } from "./Math.js";
import { DepthRenderTarget } from "./GPU/RenderTargets/DepthRenderTarget.js";
import { DepthRenderPass } from "./GPU/RenderPasses/DepthRenderPass.js";
import { TerraCamera } from "./TerraCamera.js";
import { TextureUsageEnums, TextureUsageType } from "./GPU/Texture.js";
import { BGLayout, BufLayout, SampLayout, TextLayout, ShaderStage } from "./GPU/BindGroupLayout.js";
import { UpdateView } from "./GPU/Shaders/UpdateView.comp.js";
import { ClustersComp } from "./GPU/Shaders/Clusters.comp.js";
import { SharedPipelineLayout, BindablePipelineLayout } from "./GPU/PipelineLayout.js";
import { RenderPipeline } from "./GPU/RenderPipeline.js";
import { Clusters, MeshArray, MeshUniforms, Scene, Time, UIUniforms, Uniforms, ProjectionStruct } from "./GPU/Shaders/structs/Structs.js";
import { UIVertShader } from "./GPU/Shaders/UI.vert.js";
import { UIFragShader } from "./GPU/Shaders/UI.frag.js";
import { MainNode } from "./MainNode.js";
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
type CreateRenderPipelineCB<R extends RenderPipeline> = readonly [label: string, create: (gpu: GPU, hash: string, primitive: GPUPrimitiveState) => R];

export class GPU {
    #maxInstances = 10;

    readonly mousePositionBuffer = new SharedArrayBuffer(4);
    readonly mousePosition = new Uint16Vector2(this.mousePositionBuffer);


    static readonly gpu_memory_index_size = 256;
    readonly gpu_screen_buffer_size = 16; //screen width and height and ratio
    readonly #gpu_max_point_lights = 63;

    readonly #DynamicBindGroups: WeakSet<BindGroup> = new WeakSet();

    readonly pendingCommandBuffers: GPUCommandBuffer[] = [];
    readonly tempGPUBuffers: GPUBuffer[] = [];

    readonly rootCameralayout: BindablePipelineLayout<[
        typeof this.sizeBindGroupLayout,
        typeof this.uniformBindGroupLayoutWithTime
    ]>;

    readonly projections: Set<Projection> = new Set();
    readonly cameras: TerraCamera[] = []

    //Todo: Remove COPY_SRC
    readonly GPUMeshes: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer & BindUniformBuffer
    readonly #GPUPointLights: CopyDstBuffer & BindStorageBuffer & BindUniformBuffer;
    readonly #GPUDirectionalLights: CopyDstBuffer & BindStorageBuffer
    readonly positionAndTimeBindGroup: BindablePipelineLayout<[
        typeof this.sizeBindGroupLayout,
        typeof this.uniformBindGroupLayoutWithTime,
        BGLayout<[
            BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>
        ]>
    ]>;
    readonly lightsTextureBindGroup: BindablePipelineLayout<[
        typeof this.sizeBindGroupLayout,
        typeof this.uniformBindGroupLayoutWithTime,
        BGLayout<[BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof MeshUniforms>]>,
        BGLayout<[SampLayout<ShaderStage.FRAGMENT>, TextLayout<ShaderStage.FRAGMENT>]>]>;

    readonly BindGroupPosition: BindGroup;
    readonly timeBuffer: CopyDstBuffer & BindUniformBuffer

    readonly #renderPasses: RenderPass[];

    readonly scale = {
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

    readonly #updateViewBindGroup: BindGroup;
    readonly clustersInRow: [number, number, number] = [32, 18, 48];

    readonly clusterSizeinBytes: number;


    readonly #CLUSTER_WORKGROUP_SIZE: [number, number, number] = [4, 2, 4];
    readonly CLUSTER_DISPATCH_SIZE: [number, number, number] = this.clustersInRow.map((v, i) => Math.ceil(v / this.#CLUSTER_WORKGROUP_SIZE[i]!)) as [number, number, number];

    readonly uniformBindGroupLayoutWithTime: BGLayout<[
        BufLayout<ShaderStage.VERTEX_AND_FRAGMENT, typeof Scene>,
        BufLayout<ShaderStage.VERTEX, typeof Time>,
        BufLayout<ShaderStage.FRAGMENT, typeof Clusters>,
        BufLayout<ShaderStage.FRAGMENT, typeof MeshArray>,
        BufLayout<ShaderStage.FRAGMENT, typeof ProjectionStruct>
    ]>;

    readonly #presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    readonly pickRenderPass: RenderPass<{ gRenderTargetId: ColorRenderTarget<"r32uint", TextureUsageType["RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC"]>; }>;
    readonly sizeBindGroupLayout: BGLayout<[
        BufLayout<number, typeof Uniforms>]>;

    static readonly #renderPipelines: Map<string, RenderPipeline> = new Map();
    readonly bindGroupTextureWater: SharedPipelineLayout<[
        typeof this.sizeBindGroupLayout,
        typeof this.uniformBindGroupLayoutWithTime,
        BGLayout<[BufLayout<ShaderStage.VERTEX_AND_FRAGMENT>]>,
        BGLayout<[SampLayout<ShaderStage.FRAGMENT>, TextLayout<ShaderStage.FRAGMENT>]>]>;


    readonly #ro: ResizeObserver;
    readonly #canvasRootLayout: BindablePipelineLayout<[
        typeof this.BindGroupLayoutCanvas
    ]>;
    readonly UIPipeline: RenderPipeline<UIVertShader>

    readonly updateViewShader: UpdateView;
    readonly BindGroupLayoutCanvas: BGLayout<[
        BufLayout<ShaderStage.VERTEX, typeof UIUniforms>,
        TextLayout<ShaderStage.FRAGMENT>]>
    destroyed = false;
    fps = 0
    createRenderPipeline<R extends RenderPipeline>(desc: CreateRenderPipelineCB<R>, primitive: GPUPrimitiveState & { topology: 'triangle-strip' | 'line-strip', stripIndexFormat: GPUIndexFormat }): R
    createRenderPipeline<R extends RenderPipeline>(desc: CreateRenderPipelineCB<R>, primitive: Omit<GPUPrimitiveState, 'stripIndexFormat'> & { topology: 'triangle-list' | 'line-list' }): R
    createRenderPipeline<R extends RenderPipeline>(desc: CreateRenderPipelineCB<R>, primitive?: Omit<GPUPrimitiveState, 'topology'>): R
    createRenderPipeline<R extends RenderPipeline>(desc: CreateRenderPipelineCB<R>, primitive: GPUPrimitiveState = {}): R {
        const primitiveWithDefaults: GPUPrimitiveState = {
            topology: 'triangle-list',
            frontFace: 'cw',
            cullMode: 'back',
            ...primitive
        }
        const [label, createRenderPipeline] = desc;
        const hash = label + Object.values(primitiveWithDefaults).sort().join();
        let renderPipeline = GPU.#renderPipelines.get(hash) as R | undefined;
        if (!renderPipeline) {
            renderPipeline = createRenderPipeline(this, hash, primitiveWithDefaults);
            GPU.#renderPipelines.set(hash, renderPipeline);
        }
        return renderPipeline;
    }
    #GPUQueueCommandEncoder: GPUCommandEncoder | null = null;
    #renderFrame = 0;
    /**
     * Manually destroy the device.
     * Needed to mark device as destroyed before device.lost will resolve
     * so errors from mapAsync etc. can be handled gracefully.
     */
    destroy() {
        this.destroyed = true;
        this.device.destroy();
    }
    /**
     * Called from device.lost callback when device is lost
     */
    onDeviceLost() {
        console.log('destroy GPU', this.device.label);
        this.#ro.disconnect();
        cancelAnimationFrame(this.#renderFrame);
        this.destroyed = true;
    }
    constructor(
        public canvas: HTMLCanvasElement,
        public device: GPUDevice,
        private GPUDataSizeBytes: number) {
        const totalClusters = this.clustersInRow[0] * this.clustersInRow[1] * this.clustersInRow[2]
        this.clusterSizeinBytes = totalClusters * (8 + 64) * Uint32Array.BYTES_PER_ELEMENT;
        this.updateViewShader = new UpdateView(this)

        this.GPUMeshes = Buffer.create(this, GPU.gpu_memory_index_size * this.#maxInstances, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC], 'GPUMeshes')
        this.#GPUPointLights = Buffer.create(this, this.#gpu_max_point_lights * 4, [GPUBufferUsage.UNIFORM, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST], 'GPUPointLights')
        this.#GPUDirectionalLights = Buffer.create(this, 63 * 4, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST], 'GPUDirectionalLights')


        this.#updateViewBindGroup = this.updateViewShader.props.bindGroupLayouts[0].createBindGroup('updateViewBindGroup', bindGroup => [
            {
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
            }
        ]);
        this.uniformBindGroupLayoutWithTime = new BGLayout(this, 'uniformBindGroupLayoutWithTime',
            new BufLayout(
                {
                    visibility: ShaderStage.VERTEX_AND_FRAGMENT,
                    buffer: {
                        type: "uniform",
                        minBindingSize: 144
                    }
                }, 'scene', Scene),
            new BufLayout(
                {
                    visibility: ShaderStage.VERTEX,
                    buffer: {
                        type: "uniform",
                        minBindingSize: 8
                    }
                }, 'time', Time),
            new BufLayout(
                {
                    //clusters
                    visibility: ShaderStage.FRAGMENT,
                    buffer: {
                        type: 'read-only-storage',
                        minBindingSize: 7962624 //Must be in sync with Struct Clusters in shader
                    }
                }, 'clusters_array', Clusters),
            new BufLayout(
                {   // mesh array for lights
                    visibility: ShaderStage.FRAGMENT,
                    buffer: {
                        type: "read-only-storage",
                        minBindingSize: 512
                    }
                }, 'meshes', MeshArray),
            new BufLayout(
                {   //projection
                    visibility: ShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform",
                        minBindingSize: PROJECTION_BUFFER_SIZE
                    }
                }, 'projection', ProjectionStruct)
        );
        this.sizeBindGroupLayout = new BGLayout(this, 'sizeBindGroupLayout',
            new BufLayout(
                {
                    visibility: ShaderStage.FRAGMENT | ShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform',
                        minBindingSize: 16
                    }
                }, 'uniforms', Uniforms)
        )
        this.rootCameralayout = new BindablePipelineLayout({
            label: 'rootCamera',
            bindGroupLayouts: [this.sizeBindGroupLayout, this.uniformBindGroupLayoutWithTime] as [typeof this.sizeBindGroupLayout, typeof this.uniformBindGroupLayoutWithTime],
        });
        const BindGroupLayoutPosition = new BGLayout(this,
            'BindGroupLayoutPosition',
            new BufLayout(
                {
                    visibility: ShaderStage.VERTEX_AND_FRAGMENT,
                    buffer: {
                        type: "uniform",
                        hasDynamicOffset: true,
                        minBindingSize: GPU.gpu_memory_index_size
                    }
                }, 'world', MeshUniforms)
        );
        this.BindGroupPosition = BindGroupLayoutPosition.createBindGroup('BindGroupPosition', bindGroup => [
            {
                binding: 0,
                resource: this.GPUMeshes.getUniformBinding(bindGroup, 0, GPU.gpu_memory_index_size)
            }
        ]);
        this.positionAndTimeBindGroup = this.rootCameralayout.createAppendedLayout('positionBindGroupTimeWGSLLayot', BindGroupLayoutPosition)
        this.lightsTextureBindGroup = this.positionAndTimeBindGroup.createAppendedLayout('lightsBindGroupTexture2Layout',
            new BGLayout(this,
                'lightsBindGroupTexture2',
                new SampLayout(
                    {
                        visibility: ShaderStage.FRAGMENT,
                        sampler: {
                        },
                    }, 'mySampler', 'sampler'),
                new TextLayout(
                    {
                        visibility: ShaderStage.FRAGMENT,
                        texture: {}
                    }, 'myTexture', 'texture_2d<f32>')
            ));
        this.bindGroupTextureWater = this.positionAndTimeBindGroup.createSharedLayout('lightsBindGroupTexture2PipelineLayout',
            new BGLayout(this,
                'lightsBindGroupTexture2water',
                new SampLayout(
                    {
                        visibility: ShaderStage.FRAGMENT,
                        sampler: {
                        },
                    }, 'mySampler', 'sampler'),
                new TextLayout(
                    {
                        visibility: ShaderStage.FRAGMENT,
                        texture: {}
                    }, 'diffuseTexture', 'texture_2d<f32>')
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
                    },
                    {
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
                    gRenderTargetDiffuse: new MSAARenderTarget(
                        {
                            gpu: this,
                            format: "bgra8unorm",
                            usages: TextureUsageEnums["RENDER_ATTACHMENT|TEXTURE_BINDING"],
                            label: 'diffuseTexture',
                            size: { width: 300, height: 300 }
                        },
                        {
                            writeMask: 0xF,
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
            new DepthRenderTarget(0,
                {
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
                        },
                        {
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

        this.BindGroupLayoutCanvas = new BGLayout(this, 'BindGroupLayoutUI',
            new BufLayout(
                {
                    visibility: ShaderStage.VERTEX,
                    buffer: {
                        type: "uniform",
                        minBindingSize: 8
                    }
                }, 'uniforms', UIUniforms),
            new TextLayout(
                {
                    visibility: ShaderStage.FRAGMENT,
                    texture: {
                    }
                }, 'texture', 'texture_2d<f32>')
        )
        this.#canvasRootLayout = new BindablePipelineLayout({
            label: 'canvasRootLayout',
            bindGroupLayouts: [this.BindGroupLayoutCanvas] as [typeof this.BindGroupLayoutCanvas]
        });
        const uiVertShader = new UIVertShader(this.#canvasRootLayout, {
            arrayStride: 4 * 4,
            stepMode: "vertex",
            attributes: [
                {
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
                }
            ]
        })
        this.UIPipeline = this.#canvasRootLayout.addRenderPipeline(
            {
                label: 'UIRenderPipeline',
                vertexShader: uiVertShader,
                fragmentShader: new UIFragShader(this.#canvasRootLayout),
                renderPipeline: {
                    primitive: {
                        topology: 'triangle-list',
                        frontFace: 'ccw'
                    }
                },
            });

        this.renderPassCanvas = new RenderPass({
            gpu: this,
            colorRenderTargets: {
                swap: new ColorRenderTarget(
                    {
                        gpu: this,
                        format: this.#presentationFormat,
                        usages: TextureUsageEnums.RENDER_ATTACHMENT,
                        label: 'canvasTexture',
                        size: { width: 300, height: 300 }
                    },
                    {
                        context: context,
                        writeMask: 0xF,
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
            rootLayout: this.#canvasRootLayout,
            label: 'renderPassCanvas'
        });

        //Scene layoyt is iterated manually so remove it not to iterate it twise.
        //this.rootCameralayout.subBindGroups.delete(this.rootSceneLayout);

        //water color { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }

        this.#renderPasses = [this.renderPassCanvas, this.renderPassScreen, this.renderPassWater, this.pickRenderPass];


        this.#DynamicBindGroups.add(this.BindGroupPosition);
        const timeAndDeltaBuffer = new ArrayBuffer(8);
        this.timeBuffer = Buffer.create(this, timeAndDeltaBuffer.byteLength, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST], 'timeBuffer');

        const ClustersShader = new ClustersComp(this.sizeBindGroupLayout);
        const computePipelineClustersP = ClustersShader.createComputePipeline('main');
        const updateViewPipelineP = this.updateViewShader.createComputePipeline('main');

        let resizeHandler: null | ReturnType<typeof setTimeout> = null;
        const maxResolution = {
            width: 1920,
            height: 1080
        }
        this.#ro = new window.ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry)
                return;
            if(entry.contentRect.width === 0) {
                return;
            }
            window.cancelAnimationFrame(this.#renderFrame)
            if (resizeHandler)
                clearTimeout(resizeHandler)
            resizeHandler = setTimeout(async () => {
                try {
                    const aspectRatio = entry.contentRect.width / entry.contentRect.height
                    canvas.width = Math.min((entry.contentRect.width | 0) * window.devicePixelRatio, maxResolution.width);

                    canvas.height = canvas.width / aspectRatio

                    if (canvas.height > maxResolution.height) {
                        canvas.height = maxResolution.height;
                        canvas.width = canvas.height * aspectRatio;
                    }

                    this.scale.x = canvas.width / entry.contentRect.width;
                    this.scale.y = canvas.height / entry.contentRect.height;
                    // configure() must also be called if you want to change the size of the textures returned by getCurrentTexture()
                    context.configure({
                        device: this.device,
                        format: this.#presentationFormat,
                        usage: GPUTextureUsage.RENDER_ATTACHMENT
                    })
                    const commandEncoder = this.device.createCommandEncoder({ label: 'resizeEncoder' });
                    const passEncoder = commandEncoder.beginComputePass({ label: 'resizePassEncoder' });
                    passEncoder.setPipeline(await computePipelineClustersP);

                    this.projections.forEach(projection => projection.update(aspectRatio, this));
                    this.#renderPasses.forEach(renderPass => {
                        renderPass.resize(canvas.width, canvas.height);
                        passEncoder.setBindGroup(0, renderPass.sizeBindGroup().bindGroup);
                        renderPass.perspectiveCameras.forEach(camera => {
                            camera.updateClusters(passEncoder, ClustersShader.props.bindGroupLayouts[1])
                        });
                    });
                    // Call onResize after all renderPasses have resizes so callbacks
                    // can refer updated render target of other renderpasses.
                    this.#renderPasses.forEach(renderPass => {
                        renderPass.onResize.forEach(cb => cb());
                    });
                    passEncoder.end();
                    this.device.queue.submit([commandEncoder.finish()]);
                    const updateViewPipeline = await updateViewPipelineP;
                    this.#renderFrame = window.requestAnimationFrame((time) => this.#renderLoop(time, updateViewPipeline));
                } catch (e) {
                    engine.showError(e);
                }
            }, 500)
        });
        if (!canvas.parentElement) {
            throw new Error('Canvas must have parent element');
        }
        this.#ro.observe(canvas.parentElement);
    }

    handle_gpu_queue(pointerVec: number, length: number) {
        this.#GPUQueueCommandEncoder = this.device.createCommandEncoder({ label: 'handle_gpu_queue_encoder' });
        let tempOffset = 0;
        Buffer.create(this, this.GPUDataSizeBytes * length, [GPUBufferUsage.COPY_SRC], 'handle_gpu_queue', (tempBuffer, gpu2) => {
            const pointers_to_gpumesh_and_offset = new Uint32Array(engine.memory.buffer, pointerVec, length);
            const meshes: [mesh: MainNode, gpu_alignment: number][] = [];
            for (let i = 0; i < pointers_to_gpumesh_and_offset.length; i++) {
                const meshID = pointers_to_gpumesh_and_offset[i]!;
                const mesh = MainNode.Meshes.get(meshID);
                if (!mesh) {
                    console.warn("Tried to update non exist mesh with id ", meshID);
                    continue;
                }
                const offset = engine.rust.gpu_alignment(meshID);
                meshes.push([mesh, offset]);
                if (offset >= this.#maxInstances) {
                    this.#maxInstances = offset + 10;
                    this.GPUMeshes.resize(GPU.gpu_memory_index_size * this.#maxInstances)
                }
            }
            for (let i = 0; i < meshes.length; i++) {
                const [mesh, offset] = meshes[i]!;
                const gpumeshPointer = engine.rust.gpu_pointer(mesh.id);
                const dataLength = this.GPUDataSizeBytes / 4;
                const data = new Float32Array(engine.memory.buffer, gpumeshPointer, dataLength);
                mesh.onMeshChange.forEach((cb) => cb())
                //Point light
                if (data[29]! > 0) {
                    engine.updateLights = true;
                }
                new Float32Array(tempBuffer.getMappedRange(tempOffset * this.GPUDataSizeBytes, this.GPUDataSizeBytes)).set(data);
                gpu2.GPUMeshes.copyFrom(this.#GPUQueueCommandEncoder!,
                    tempBuffer,
                    tempOffset++ * this.GPUDataSizeBytes,
                    offset * GPU.gpu_memory_index_size, this.GPUDataSizeBytes)
            }
            gpu2.tempGPUBuffers.push(tempBuffer);
        });
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
        this.pendingCommandBuffers.push(commandEncoder.finish({ label: 'update_directional_lights' }));
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
        this.pendingCommandBuffers.push(commandEncoder.finish({ label: 'update_point_lights' }));
    }
    readonly timeAndDeltaBuffer = new ArrayBuffer(8);
    readonly deltaView = new Float32Array(this.timeAndDeltaBuffer, 4, 1);
    readonly #timeView = new Uint32Array(this.timeAndDeltaBuffer, 0, 1);
    #renderStarted = false;
    #renderStartedCallbacks: (() => void)[] = []
    afterRenderStart(cb: () => void) {
        if (this.#renderStarted) {
            cb();
        } else {
            this.#renderStartedCallbacks.push(cb);
        }
    }
    readonly #renderLoop = (time: DOMHighResTimeStamp, updateViewPipeline: GPUComputePipeline) => {
        //msPerFrame = performance.now() - startTime;
        //startTime = performance.now();

        const nowSecond = (Date.now() / 500) | 0;
        if (nowSecond !== curSecond) {
            this.fps = framecount * 2; // Update fps twice a second so framecount is for half second
            curSecond = nowSecond;
            framecount = 0;
        }
        framecount++;
        //performance.mark('renderloopStart');

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
            // Rust render loop start
            this.#GPUQueueCommandEncoder = null;
            engine.rust.renderloop();
            //@ts-expect-error bug in TS
            const commandBuff = this.#GPUQueueCommandEncoder?.finish({ label: 'renderloop' }) ?? null;
            if (commandBuff) {
                // Insert this to begin of the array to get all changes to mesh properties affected first
                this.pendingCommandBuffers.unshift(commandBuff);
            }
            // Rust render loop end
            const lightPass = renderEncoder.beginComputePass({ label: 'lightPassEncoder' });
            lightPass.setPipeline(updateViewPipeline);
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
                //Do the actual drawing
                renderPass.render(renderEncoder)
            })
        } catch (e) {
            console.error(e);
        }

        this.pendingCommandBuffers.push(renderEncoder.finish({ label: 'renderencoder' }))
        this.device.queue.submit(this.pendingCommandBuffers);
        // Cluster debug
        /*
        if(debugNumber === 0) {
            readBuffer?.readAndDestroy((buff) => {
                console.log('clusters',new Uint32Array(buff,8*4 * 27648 + 4 * 27648, 2 ));
            });
            debugNumber=debugNumber+1;
        }*/
        this.pendingCommandBuffers.length = 0;
        this.tempGPUBuffers.forEach(buff => buff.destroy());
        this.tempGPUBuffers.length = 0;
        if (!this.#renderStarted) {
            this.#renderStartedCallbacks.forEach(cb => cb());
            this.#renderStartedCallbacks.length = 0;
            this.#renderStarted = true;
        }
        this.#renderFrame = window.requestAnimationFrame((time2) => this.#renderLoop(time2, updateViewPipeline));
    }
}