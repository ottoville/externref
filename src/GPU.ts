import { RenderPass } from "./GPU/RenderPasses/RenderPass.js";
import { PickableRenderPass } from "./GPU/RenderPasses/PickableRenderPass.js";

import { type LayoutGroupDrawable, PipelineLayout } from "./GPU/PipelineLayout.js";
import { ColorRenderTarget } from "./GPU/RenderTargets/ColorRenderTarget.js";
import { BindGroupLayout, type GPUBindGroupTextureEntry } from "./GPU/BindGroupLayout.js";
import type { Projection } from "./GPU/Projection.js";
import shaders from "./shaders.json" assert { type: "json" };
import { MSAARenderTarget } from "./GPU/RenderTargets/MSAARenderTarget.js";
import type { RenderPipeline } from "./GPU/RenderPipeline.js";
import { ComputePipeline } from "./GPU/ComputePipeline.js";
import type { BindGroup } from "./GPU/BindGroup.js";
import { BindStorageBuffer, BindUniformBuffer, Buffer, CopyDstBuffer, CopySrcBuffer } from "./GPU/Buffer.js";

import type { Engine, } from "./engine.js";
import { Uint16Vector2 } from "./Math.js";
import { DepthRenderTarget } from "./GPU/RenderTargets/DepthRenderTarget.js";
import { DepthRenderPass } from "./GPU/RenderPasses/DepthRenderPass.js";
declare const engine:Engine;


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
let curSecond = 0;
let framecount = 0;
/* Todo: make dynamic with treshold values */
const maxInstances = 10;

// Cluster debug
/*

let debugNumber=0;
//@ts-ignore
window.resetDebugNumber = () => {
    debugNumber = 0;
}
*/
export class GPU {
    readonly #mousePositionBuffer = new SharedArrayBuffer(4);
    readonly mousePosition = new Uint16Vector2(this.#mousePositionBuffer);


    static readonly gpu_memory_index_size=256;
    readonly gpu_screen_buffer_size= 16; //screen width and height and ratio
    readonly gpu_max_point_lights=63;

    readonly #DynamicBindGroups: WeakSet<BindGroup> = new WeakSet();

    readonly pendingCommandBuffers: Set<GPUCommandBuffer> = new Set();
    readonly tempGPUBuffers: GPUBuffer[] = [];
    
    readonly rootCameralayout:PipelineLayout;

    readonly projections: Set<Projection> = new Set();
    
    //Todo: Remove COPY_SRC
    readonly GPUMeshes: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer & BindUniformBuffer
    readonly #GPUPointLights: CopyDstBuffer & BindStorageBuffer & BindUniformBuffer;
    readonly #GPUDirectionalLights:  CopyDstBuffer & BindStorageBuffer
    readonly positionBindGroupTimeWGSL:LayoutGroupDrawable<[GPUBindGroupEntry]>;

    readonly lightsBindGroupTexture2 : LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry]>;

    readonly BindGroupPosition: BindGroup;
    readonly positionBindGroupTime:PipelineLayout;
    readonly timeBuffer: CopyDstBuffer & BindUniformBuffer

    readonly #renderPasses: RenderPass[];

    readonly #scale = {
        x: 1,
        y: 1
    }
    readonly renderPassScreen: PickableRenderPass<{
        gRenderTargetDiffuse: () => MSAARenderTarget<"bgra8unorm", ["RENDER_ATTACHMENT", "TEXTURE_BINDING"]>;
    }>;

    readonly renderPassWater: DepthRenderPass<{
        diffuse: () => ColorRenderTarget<"bgra8unorm", ['RENDER_ATTACHMENT', 'TEXTURE_BINDING']>;
    }>;
    readonly renderPassCanvas: RenderPass<{ swap: () => ColorRenderTarget<GPUTextureFormat, ["RENDER_ATTACHMENT"]>; }>;

    updateViewPipeline:ComputePipeline;
    readonly #updateViewBindGroup: BindGroup;
    readonly clustersInRow:[number,number,number]=[32, 18, 48];

    readonly clusterSizeinBytes: number;


    readonly #CLUSTER_WORKGROUP_SIZE:[number,number,number] = [4, 2, 4];
    readonly CLUSTER_DISPATCH_SIZE:[number,number,number] = this.clustersInRow.map((v,i) => Math.ceil(v/this.#CLUSTER_WORKGROUP_SIZE[i]!)) as [number,number,number];
   // readonly CLUSTER_DISPATCH_SIZE:[number,number,number] = [1,1,1];
    readonly viewUniformsLayout: BindGroupLayout;
    readonly uniformBindGroupLayoutWithTime: BindGroupLayout<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>;
    readonly #presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    readonly shaderModules = {} as { [K in keyof typeof shaders]: GPUShaderModule }
    readonly pickRenderPass: RenderPass<{ gRenderTargetId: () => ColorRenderTarget<"r32uint", ["RENDER_ATTACHMENT", "TEXTURE_BINDING", "COPY_SRC"]>; }>;
    readonly sizeBindGroupLayout: BindGroupLayout<[GPUBindGroupEntry]>;
    static readonly #renderPipelines: Map<string, RenderPipeline> = new Map();
    readonly bindGroupTextureWater: LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupTextureEntry<unknown>]>;
    createRenderPipeline(desc:readonly [label: string, create:(gpu:GPU, hash:string,primitive: GPUPrimitiveState) => RenderPipeline], primitive: GPUPrimitiveState & { topology: 'triangle-strip' | 'line-strip', stripIndexFormat: GPUIndexFormat}): RenderPipeline
    createRenderPipeline(desc:readonly [label: string, create:(gpu:GPU, hash:string,primitive: GPUPrimitiveState) => RenderPipeline], primitive: Omit<GPUPrimitiveState, 'stripIndexFormat'> & { topology: 'triangle-list' | 'line-list'}): RenderPipeline
    createRenderPipeline(desc:readonly [label: string, create:(gpu:GPU, hash:string,primitive: GPUPrimitiveState) => RenderPipeline], primitive?: Omit<GPUPrimitiveState, 'topology'>): RenderPipeline
    createRenderPipeline(desc:readonly [label: string, create:(gpu:GPU, hash:string,primitive: GPUPrimitiveState) => RenderPipeline], primitive: GPUPrimitiveState={}) {
        const primitiveWithDefaults: GPUPrimitiveState={
            topology: 'triangle-list',
            frontFace: 'cw',
            cullMode: 'back',
            ...primitive
        }
        const hash = desc[0]+Object.values(primitiveWithDefaults).sort().join();
        let renderPipeline = GPU.#renderPipelines.get(hash);
        if(!renderPipeline) {
            renderPipeline=desc[1](this, hash, primitiveWithDefaults);
            if(renderPipeline)
                GPU.#renderPipelines.set(hash, renderPipeline);
        }
        return renderPipeline;

    }
    #GPUQueueCommandEncoder:GPUCommandEncoder | null = null;
    static async create(canvas: HTMLCanvasElement, GPUDataSize: number) {
        if (!window.navigator.gpu) {
            throw(new Error('no webgpu support'));
        }

        const adapter = await window.navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }).then(GPUAdapter => {
            if(!GPUAdapter) {
                console.error('Failed to get adapter, getting fallback adapter');
                return window.navigator.gpu.requestAdapter({ powerPreference: 'high-performance', forceFallbackAdapter: true });
            }
            return GPUAdapter;
        })
        if(!adapter) {
            throw (new Error('Failed to get adapter'));
        }
        const device = await adapter.requestDevice();
        //this.progress = 5;
        if (!device)
            throw (new Error('no GPU device'));

        device.lost.then(reason => {
            console.error('GPU device lost', reason);
        }).catch((e) => {
            //TODO do this when device lost is handled properly
            if(e instanceof Error)
                throw(e)
            else
                throw(new Error(e));
        });
        return new GPU(canvas, device, GPUDataSize);
    }
    #renderFrame = 0;
    constructor(public canvas: HTMLCanvasElement, public device: GPUDevice,  private GPUDataSizeBytes: number) {
        for(const key in shaders) {
            const k=key as keyof typeof shaders;
            this.shaderModules[k] = device.createShaderModule({ code: shaders[k], label:k });
        }
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
        this.viewUniformsLayout= new BindGroupLayout(this, this.device.createBindGroupLayout({
            label:'viewUniformsLayout',
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
        }))
        this.updateViewPipeline=new ComputePipeline(this,'updateView.comp.wgsl',
            this.device.createPipelineLayout({bindGroupLayouts:[viewLayout.layout, this.viewUniformsLayout.layout]}));
        this.GPUMeshes = Buffer.create(this, GPU.gpu_memory_index_size /* meshes count etc */ + GPU.gpu_memory_index_size * maxInstances, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC],'GPUMeshes')
        this.#GPUPointLights = Buffer.create(this, this.gpu_max_point_lights*4,[GPUBufferUsage.UNIFORM,GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST],'GPUPointLights')
        this.#GPUDirectionalLights = Buffer.create(this, 63*4,[GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST],'GPUDirectionalLights')
        
        
        this.#updateViewBindGroup=viewLayout.createBindGroup('updateViewBindGroup',bindGroup => [{
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
        this.sizeBindGroupLayout = BindGroupLayout.create(this, 'sizeBindGroupLayout',{
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
            buffer: { type: 'uniform'}
        })
        const sizePipelineLayout = new PipelineLayout('renderPass', this, this.sizeBindGroupLayout, undefined, undefined, false,true);

        this.rootCameralayout = new PipelineLayout('rootCamera', this, this.uniformBindGroupLayoutWithTime, sizePipelineLayout, undefined, false, false);

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
        this.BindGroupPosition = BindGroupLayoutPosition.createBindGroup('BindGroupPosition',bindGroup => [
            {
                binding: 0,
                resource: this.GPUMeshes.getUniformBinding(bindGroup, 0, GPU.gpu_memory_index_size)
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
        this.bindGroupTextureWater = this.positionBindGroupTimeWGSL.addChildLayout('water', BindGroupLayout.create(
            this,
            'water',
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    type:'non-filtering'
                }
            }, {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
    
                }
            }
        ));

        this.pickRenderPass=new RenderPass(this,
            {
                gRenderTargetId: ColorRenderTarget.createForRenderpass("r32uint",['RENDER_ATTACHMENT', 'TEXTURE_BINDING','COPY_SRC'], 'idTexture', { r: 0.0, g: 1.0, b: 0.0, a: 1.0 },[300,300,1],{ baseArrayLayer: 0, arrayLayerCount: 1 })
            },1,[canvas.width,canvas.height,1],(w, h) => {
            return [w, h]
        },'pick',this.rootCameralayout,'pickRenderPass');

        this.renderPassScreen = new PickableRenderPass(this, {
            gRenderTargetDiffuse: MSAARenderTarget.createForRenderpass("bgra8unorm",['RENDER_ATTACHMENT', 'TEXTURE_BINDING'],'diffuseTexture', { r: 0.53, g: 0.8, b: 0.92, a: 0.0 }),

        }, 4, [canvas.width,canvas.height,1],
            (w, h) => {
                return [w, h]
            },'main',this.rootCameralayout,'renderPassScreen',DepthRenderTarget.createForRenderpass('depth32float',['RENDER_ATTACHMENT', 'COPY_SRC', 'TEXTURE_BINDING'],'depthTexture_renderPassWater' ,0,undefined,undefined, undefined,undefined,4));

        this.renderPassWater = new DepthRenderPass(this, {
            diffuse: ColorRenderTarget.createForRenderpass("bgra8unorm",['RENDER_ATTACHMENT', 'TEXTURE_BINDING'],'diffuseTextureWater', { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }),
        
        }, 1, [canvas.width,canvas.height,1], (w, h) => [w >> 2, h >> 2],'main',this.rootCameralayout,'renderPassWater',

        DepthRenderTarget.createForRenderpass('depth32float',['RENDER_ATTACHMENT', 'COPY_SRC'],'depthTexture_renderPassWater' ,0,undefined,undefined, undefined,undefined,1)
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

        const BindGroupLayoutCanvas = BindGroupLayout.create(this,'BindGroupLayoutCanvas',
        {   //diffuse
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
            } as GPUTextureBindingLayout
        }
    );
        const canvasRootLayout = new PipelineLayout('canvasRootLayout', this, BindGroupLayoutCanvas);

        this.renderPassCanvas = new RenderPass(this, {
            swap: ColorRenderTarget.createForRenderpass(this.#presentationFormat,['RENDER_ATTACHMENT'],'canvasTexture', { r: 0.53, g: 0.8, b: 0.92, a: 1.0 },undefined, undefined,undefined, context)
        }, 1, [canvas.width,canvas.height,1],
            (w, h) => {
                return [w, h]
            },'main',canvasRootLayout,'renderPassCanvas');

        //Scene layoyt is iterated manually so remove it not to iterate it twise.
        //this.rootCameralayout.subBindGroups.delete(this.rootSceneLayout);

        //water color { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }

        this.#renderPasses = [this.renderPassCanvas, this.renderPassScreen, this.renderPassWater, this.pickRenderPass];

        this.renderPassCanvas.BindGroupCanvas = () =>  BindGroupLayoutCanvas.createBindGroup('BindGroupCanvas', (bindGroup) => [
            {
                binding: 0,
                resource: this.renderPassScreen.colorRenderTargets.gRenderTargetDiffuse.resolveTexture!.view.getTextureBinding(bindGroup)
            }]
        );
        
        this.#DynamicBindGroups.add(this.BindGroupPosition);
        const timeAndDeltaBuffer = new ArrayBuffer(8);
        this.timeBuffer = Buffer.create(this, timeAndDeltaBuffer.byteLength, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST],'timeBuffer');
        
        const computePipelineClustersLayout = new BindGroupLayout(this, {label: 'computePipelineClustersLayout', entries: [
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
        ]} )
        const computePipelineClusters       = new ComputePipeline(this,'clusters.comp.wgsl',
        this.device.createPipelineLayout({
            bindGroupLayouts:[this.sizeBindGroupLayout.layout, computePipelineClustersLayout.layout]
        }));
        let resizeHandler:null | ReturnType<typeof setTimeout> = null;
        const maxResolution = {
            width: 1920,
            height: 1080
        }
        const ro = new window.ResizeObserver(entries => {
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
                    const commandEncoder = this.device.createCommandEncoder({label: 'resizeEncoder'});
                    const passEncoder = commandEncoder.beginComputePass({label: 'resizePassEncoder'});
                    passEncoder.setPipeline(computePipelineClusters.pipeline);
                    
                    this.projections.forEach(projection => projection.update(aspectRatio))

                    this.#renderPasses.forEach(renderPass => {
                        renderPass.resize(canvas.width, canvas.height);
                        passEncoder.setBindGroup(0, renderPass.sizeBindGroup().bindGroup);
                        renderPass.cameras.forEach(camera => {
                            camera.updateProjection(passEncoder,computePipelineClustersLayout)
                        });
                    });
                    passEncoder.end();
                    this.device.queue.submit([commandEncoder.finish()]);

                    this.#renderFrame = window.requestAnimationFrame(this.#renderLoop);
                } catch(e) {
                    engine.showError(e);
                }
            }, 500)
        });
        if(!canvas.parentElement) {
            throw new Error('Canvas must have parent element');
        }
        ro.observe(canvas.parentElement);
        canvas.addEventListener('pointermove', (e) => {
            Atomics.store(this.mousePosition, 0, e.clientX * this.#scale.x)
            Atomics.store(this.mousePosition, 1, e.clientY * this.#scale.y)
            Atomics.notify(new Int32Array(this.#mousePositionBuffer), 0);
        });
    }
    readonly #queue_map = new Map<number, number>();

    handle_gpu_queue(pointerVec:number, length:number) {
        this.#GPUQueueCommandEncoder=this.device.createCommandEncoder({label: 'handle_gpu_queue_encoder'});
        const pointers_to_gpumesh_and_alignment = new Uint32Array(engine.memory.buffer, pointerVec, length * 2);
        for (let i = 0; i < pointers_to_gpumesh_and_alignment.length; i += 2) {
            this.#queue_map.set(pointers_to_gpumesh_and_alignment[i]!, pointers_to_gpumesh_and_alignment[i + 1]!);
        }
        let tempOffset = 0;

        Buffer.create(this, this.GPUDataSizeBytes * this.#queue_map.size, [GPUBufferUsage.COPY_SRC],'handle_gpu_queue', (tempBuffer, gpu2) => {
            this.#queue_map.forEach((alignment, gpumeshPointer) => {
                const data = new Float32Array(engine.memory.buffer, gpumeshPointer, this.GPUDataSizeBytes/4);
                //Point light
                if (data[29]! > 0) {
                    engine.updateLights = true;
                }
                new Float32Array(tempBuffer.getMappedRange(tempOffset * this.GPUDataSizeBytes, this.GPUDataSizeBytes)).set(data);
                gpu2.GPUMeshes.copyFrom(this.#GPUQueueCommandEncoder!, tempBuffer, tempOffset++ * this.GPUDataSizeBytes, GPU.gpu_memory_index_size + alignment * GPU.gpu_memory_index_size, this.GPUDataSizeBytes)
            });
            this.#queue_map.clear();
            gpu2.tempGPUBuffers.push(tempBuffer);
        });
    }
        //TODO: Queue this call and do it only once per frame
    updateAllocatedMemory(allocated_gpu_memory_ptr:number, length:number) {
        const renderEncoder = this.device.createCommandEncoder({label: 'updateAllocatedMemory_encoder'});
        const buffLength = Uint32Array.BYTES_PER_ELEMENT * length;
        const tempBuffer = Buffer.create(this, buffLength, [GPUBufferUsage.COPY_SRC],'tempBuffer', tempBuffer2 => {
            new Uint32Array(tempBuffer2.getMappedRange(0, buffLength)).set(new Uint32Array(engine.rust.memory.buffer, allocated_gpu_memory_ptr, length));
        });
        tempBuffer.copyTo(renderEncoder, this.GPUMeshes,0, 0, buffLength);
    }
    update_directional_lights(pointer:number, length:number) {
        const lights = new Uint32Array(engine.memory.buffer, pointer, length);
        const commandEncoder = this.device.createCommandEncoder({label: 'update_directional_lights_encoder'});
        //TODO: Potential buffer overflow
        const byteLength = 4 + lights.byteLength;
        const tempBuffer = Buffer.create(this, byteLength, [GPUBufferUsage.COPY_SRC], 'directional_lights_tempBuffer', tempBuffer2 => {
            const gpu_buffer=new Uint32Array(tempBuffer2.getMappedRange());
            gpu_buffer[0] = lights.length;
            gpu_buffer.set(lights,1);
        });
        tempBuffer.copyTo(commandEncoder, this.#GPUDirectionalLights, 0, 0, byteLength);
        this.pendingCommandBuffers.add(commandEncoder.finish());
    }
    update_point_lights(pointer:number, length:number) {
        const lights = new Uint32Array(engine.memory.buffer, pointer, length);
        const commandEncoder = this.device.createCommandEncoder({label: 'update_point_lights_encoder'});
        //TODO: Potential buffer overflow
        const byteLength = 4 + lights.byteLength;
        const tempBuffer = Buffer.create(this, byteLength, [GPUBufferUsage.COPY_SRC], 'point_lights_tempBuffer', tempBuffer2 => {
            const gpu_buffer=new Uint32Array(tempBuffer2.getMappedRange());
            gpu_buffer[0] = lights.length;
            gpu_buffer.set(lights,1);
        });
        tempBuffer.copyTo(commandEncoder, this.#GPUPointLights,0,0,byteLength);
        this.pendingCommandBuffers.add(commandEncoder.finish());
    }
    readonly #timeAndDeltaBuffer = new ArrayBuffer(8);
    readonly deltaView = new Float32Array(this.#timeAndDeltaBuffer, 4, 1);
    readonly #timeView = new Uint32Array(this.#timeAndDeltaBuffer, 0, 1);

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



        this.#GPUQueueCommandEncoder=null;
        engine.rust.renderloop();
        //@ts-ignore bug in TS
        const commandBuff= this.#GPUQueueCommandEncoder?.finish() ?? null;
        if(commandBuff)
            this.pendingCommandBuffers.add(commandBuff);

        if (engine.inputManager?.checkInputs()) {
            if(engine.inputManager.calculateCameraPositionAndTarget)
            engine.inputManager.calculateCameraPositionAndTarget();
        }

        const renderEncoder = this.device.createCommandEncoder({label:'renderloop_renderEncoder'});

        this.#timeView.set([time]);
        let physicDelta: number | null;
        if (engine.physics.gameSpeed == -1)
            physicDelta = null;
        else
            physicDelta = (engine.physics.physicTime - engine.physics.tickTime) / ((engine.physics.tickIntervalMs))

        if (physicDelta !== null)
            this.deltaView.set([physicDelta]);

        this.timeBuffer.write(0, this.#timeAndDeltaBuffer);
        try {
            engine.cameras.forEach(camera => {
                camera.updateView(renderEncoder)
            })
            const lightPass = renderEncoder.beginComputePass({label: 'lightPassEncoder'});
            lightPass.setPipeline(this.updateViewPipeline.pipeline);
            lightPass.setBindGroup(0, this.#updateViewBindGroup.bindGroup);
            engine.cameras.forEach(camera => {
                if(camera.viewUpdated || engine.updateLights) {
                    camera.viewUpdated=false;
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
        this.tempGPUBuffers.length=0;
        engine.renderFrame = window.requestAnimationFrame(this.#renderLoop);
    }
}