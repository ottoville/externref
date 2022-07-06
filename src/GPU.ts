import { MainNode } from "./MainNode.js";
import { RenderPass } from "./GPU/RenderPasses/RenderPass.js";
import { PickableRenderPass } from "./GPU/RenderPasses/PickableRenderPass.js";
import { DepthRenderPass } from "./GPU/RenderPasses/DepthRenderPass.js";

import { type LayoutGroupDrawable, PipelineLayout } from "./GPU/PipelineLayout.js";
import { RenderTarget } from "./GPU/RenderTargets/RenderTarget.js";
import { BindGroupLayout, type GPUBindGroupTextureEntry } from "./GPU/BindGroupLayout.js";
import {Texture } from "./GPU/Texture.js";
import type { Projection } from "./GPU/Projection.js";
import shaders from "./shaders.json" assert { type: "json" };
import { MSAARenderTarget } from "./GPU/RenderTargets/MSAARenderTarget.js";
import type { RenderPipeline } from "./GPU/RenderPipeline.js";
import { ComputePipeline } from "./GPU/ComputePipeline.js";
import type { BindGroup } from "./GPU/BindGroup.js";
import { BindStorageBuffer, BindUniformBuffer, Buffer, CopyDstBuffer, CopySrcBuffer } from "./GPU/Buffer.js";

import type { Engine, } from "./engine.js";
import { Uint16Vector2 } from "./Math.js";
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

// Cluster debug
/*
let debugNumber=0;
//@ts-ignore
window.resetDebugNumber = () => {
    debugNumber = 0;
}
*/
const dataSizeBytes = MainNode.GPUDataSize * 4; //4 * 16 + 3 * 4;
export class GPU {
    static bindMap:WeakMap<GPUBindingResource, BindGroup[]> = new WeakMap();

    readonly #mousePositionBuffer = new SharedArrayBuffer(4);
    readonly mousePosition = new Uint16Vector2(this.#mousePositionBuffer);


    readonly gpu_memory_index_size=256;
    readonly gpu_screen_buffer_size= 16; //screen width and height and ratio
    readonly gpu_max_point_lights=63;

    readonly GPUBindGroupLayouts: WeakMap<GPUBindGroup, BindGroupLayout<GPUBindGroupEntry[]>> = new WeakMap();
    readonly #DynamicBindGroups: WeakSet<GPUBindGroup> = new WeakSet();

    readonly pendingCommandBuffers: Set<GPUCommandBuffer> = new Set();
    readonly tempGPUBuffers: GPUBuffer[] = [];
    
    readonly rootCameralayout:PipelineLayout;

    projections: Set<Projection> = new Set();
    
    //Todo: Remove COPY_SRC
    readonly GPUMeshes: CopySrcBuffer & CopyDstBuffer & BindStorageBuffer & BindUniformBuffer
    readonly GPUPointLights: CopyDstBuffer & BindStorageBuffer & BindUniformBuffer;
    readonly GPUDirectionalLights:  CopyDstBuffer & BindStorageBuffer
    readonly positionBindGroupTimeWGSL:LayoutGroupDrawable<[GPUBindGroupEntry]>;


    readonly uniformBindGroupLayoutLightsWGSL2 : BindGroupLayout<[GPUBindGroupEntry]>;

    readonly lightsBindGroupTexture2 : LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry]>;

    readonly BindGroupPosition:GPUBindGroup;
    readonly positionBindGroupTime:PipelineLayout;
    readonly timeGroup: { binding: number; resource: { buffer: GPUBuffer }; };
    readonly timeBuffer: CopyDstBuffer & BindUniformBuffer

    readonly renderPasses: Set<RenderPass>;

    readonly scale = {
        x: 1,
        y: 1
    }
    readonly renderPassScreen: PickableRenderPass<{
        gRenderTargetDiffuse: RenderTarget<Texture<"bgra8unorm", ["RENDER_ATTACHMENT", "TEXTURE_BINDING"]>>;
    }>;

    readonly renderPassWater: DepthRenderPass<{
        diffuse: RenderTarget<Texture<"bgra8unorm", ['RENDER_ATTACHMENT', 'TEXTURE_BINDING']>>;
    }>;
    readonly renderPassCanvas: RenderPass<{ swap: RenderTarget<Texture<GPUTextureFormat, ["RENDER_ATTACHMENT"]>>; }>;

    updateViewPipeline:ComputePipeline;
    updateViewBindGroup: GPUBindGroup;
    readonly clustersInRow:[number,number,number]=[32, 18, 48];

    readonly clusterSizeinBytes: number;


    readonly CLUSTER_WORKGROUP_SIZE:[number,number,number] = [4, 2, 4];
    readonly CLUSTER_DISPATCH_SIZE:[number,number,number] = this.clustersInRow.map((v,i) => Math.ceil(v/this.CLUSTER_WORKGROUP_SIZE[i]!)) as [number,number,number];
   // readonly CLUSTER_DISPATCH_SIZE:[number,number,number] = [1,1,1];
    viewUniformsLayout: GPUBindGroupLayout;
    readonly uniformBindGroupLayoutWithTime: BindGroupLayout<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>;
    readonly presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    readonly shaderModules = {} as { [K in keyof typeof shaders]: GPUShaderModule }
    pickRenderPass: RenderPass<{ gRenderTargetId: RenderTarget<Texture<"r32uint", ["RENDER_ATTACHMENT", "TEXTURE_BINDING", "COPY_SRC"]>>; }>;
    sizeBindGroupLayout: BindGroupLayout<[GPUBindGroupEntry]>;
    static readonly #renderPipelines: Map<string, RenderPipeline> = new Map();
    bindGroupTextureWater: LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupTextureEntry<unknown>]>;
    static createRenderPipeline(desc:readonly [label: string, create:(hash:string,primitive: GPUPrimitiveState) => RenderPipeline | undefined], primitive: GPUPrimitiveState & { topology: 'triangle-strip' | 'line-strip', stripIndexFormat: GPUIndexFormat}): RenderPipeline | undefined
    static createRenderPipeline(desc:readonly [label: string, create:(hash:string,primitive: GPUPrimitiveState) => RenderPipeline | undefined], primitive: Omit<GPUPrimitiveState, 'stripIndexFormat'> & { topology: 'triangle-list' | 'line-list'}): RenderPipeline | undefined
    static createRenderPipeline(desc:readonly [label: string, create:(hash:string,primitive: GPUPrimitiveState) => RenderPipeline | undefined], primitive?: Omit<GPUPrimitiveState, 'topology'>): RenderPipeline | undefined
    static createRenderPipeline(desc:readonly [label: string, create:(hash:string,primitive: GPUPrimitiveState) => RenderPipeline | undefined], primitive: GPUPrimitiveState={}) {
        const primitiveWithDefaults: GPUPrimitiveState={
            topology: 'triangle-list',
            frontFace: 'cw',
            cullMode: 'back',
            ...primitive
        }
        const hash = desc[0]+Object.values(primitiveWithDefaults).sort().join();
        let renderPipeline = GPU.#renderPipelines.get(hash);
        if(!renderPipeline) {
            renderPipeline=desc[1](hash, primitiveWithDefaults);
            if(renderPipeline)
                GPU.#renderPipelines.set(hash, renderPipeline);
        }
        return renderPipeline;

    }
    GPUQueueCommandEncoder:GPUCommandEncoder | null = null;
    static async create(canvas: HTMLCanvasElement) {
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
        return new GPU(canvas, device);
    }
    renderFrame = 0;
    constructor(public canvas: HTMLCanvasElement, public device: GPUDevice) {
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
        this.viewUniformsLayout= this.device.createBindGroupLayout({
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
        });
        this.updateViewPipeline=new ComputePipeline(this,'updateView.comp.wgsl',
            this.device.createPipelineLayout({bindGroupLayouts:[viewLayout.layout, this.viewUniformsLayout]}));

        this.GPUMeshes = Buffer.create(this, MainNode.alignment /* meshes count etc */ + MainNode.alignment * MainNode.maxInstances, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_SRC],'GPUMeshes')
        this.GPUPointLights = Buffer.create(this, this.gpu_max_point_lights*4,[GPUBufferUsage.UNIFORM,GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST],'GPUPointLights')
        this.GPUDirectionalLights = Buffer.create(this, 63*4,[GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST],'GPUDirectionalLights')
        
        
        this.updateViewBindGroup=viewLayout.createBindGroup('updateViewBindGroup',[{
            binding: 0,
            resource: this.GPUMeshes.getStorageBinding(),
        },
        {
            binding: 1,
            resource: this.GPUPointLights.getStorageBinding(),
        },
        {
            binding: 2,
            resource: this.GPUDirectionalLights.getStorageBinding(),
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

        this.uniformBindGroupLayoutLightsWGSL2 = BindGroupLayout.create(this,'uniformBindGroupLayoutLightsWGSL2',
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: "uniform"
                }
            }
        );

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
        this.BindGroupPosition = BindGroupLayoutPosition.createBindGroup('BindGroupPosition',[
            {
                binding: 0,
                resource: this.GPUMeshes.getUniformBinding(0, MainNode.GPUDataSize * 4)
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
        const idTexture = Texture.create(this,"r32uint",['RENDER_ATTACHMENT', 'TEXTURE_BINDING','COPY_SRC'],'idTexture',[300,300,1])
        const diffuseTexture = Texture.create(this,"bgra8unorm",['RENDER_ATTACHMENT', 'TEXTURE_BINDING'],'diffuseTexture') //TODO: remove texture binding

        const gRenderTargetDiffuse = new MSAARenderTarget(diffuseTexture, { r: 0.53, g: 0.8, b: 0.92, a: 0.0 });

        this.pickRenderPass=new RenderPass(this,
            {
                gRenderTargetId: new RenderTarget(idTexture, { r: 0.0, g: 1.0, b: 0.0, a: 1.0 },{ baseArrayLayer: 0, arrayLayerCount: 1 })
            },1,[canvas.width,canvas.height,1],(w, h) => {
            return [w, h]
        },'pick',this.rootCameralayout,'pickRenderPass');

        this.renderPassScreen = new PickableRenderPass(this, {
            gRenderTargetDiffuse
        }, 4, [canvas.width,canvas.height,1],
            (w, h) => {
                return [w, h]
            },'main',this.rootCameralayout,'renderPassScreen');
        const diffuseTextureWater = Texture.create(this,"bgra8unorm",['RENDER_ATTACHMENT', 'TEXTURE_BINDING'],'diffuseTextureWater')
    
        this.renderPassWater = new DepthRenderPass(this, {
            diffuse: new RenderTarget(diffuseTextureWater, { r: 0.023, g: 0.25, b: 0.45, a: 1.0 })
        }, 1, [canvas.width,canvas.height,1], (w, h) => [w >> 2, h >> 2],'main',this.rootCameralayout,'renderPassWater');
      

        const context: GPUCanvasContext | null = canvas.getContext('webgpu') as unknown as GPUCanvasContext; // unknown for jest
        if (!context)
            throw (new Error('Unable to get webgpu context'));
        
        context.configure({
            device: device,
            format: this.presentationFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        const canvasTexture = Texture.create(this,this.presentationFormat,['RENDER_ATTACHMENT'],'canvasTexture')
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
            swap: new RenderTarget(canvasTexture, { r: 0.53, g: 0.8, b: 0.92, a: 1.0 },undefined, undefined, context)
        }, 1, [canvas.width,canvas.height,1],
            (w, h) => {
                return [w, h]
            },'main',canvasRootLayout,'renderPassCanvas');

        //Scene layoyt is iterated manually so remove it not to iterate it twise.
        //this.rootCameralayout.subBindGroups.delete(this.rootSceneLayout);

        //water color { r: 0.023, g: 0.25, b: 0.45, a: 1.0 }

        this.renderPasses = new Set([this.renderPassCanvas, this.renderPassScreen, this.renderPassWater, this.pickRenderPass]);
        //[this.renderPassCanvas, this.renderPassScreen, this.renderPassWater] = renderPasses;

        this.renderPassCanvas.BindGroupCanvas = () =>  BindGroupLayoutCanvas.createBindGroup('BindGroupCanvas',[
            {
                binding: 0,
                resource: this.renderPassScreen.renderTargets.gRenderTargetDiffuse.viewOrResolve(this.renderPassCanvas)
            }]
        );
        
        this.#DynamicBindGroups.add(this.BindGroupPosition);
        const timeAndDeltaBuffer = new ArrayBuffer(8);
        this.timeBuffer = Buffer.create(this, timeAndDeltaBuffer.byteLength, [GPUBufferUsage.UNIFORM, GPUBufferUsage.COPY_DST],'timeBuffer');
        this.timeGroup = {
            binding: 1,
            resource: this.timeBuffer.getUniformBinding()
        }

        const computePipelineClustersLayout = this.device.createBindGroupLayout({label: 'computePipelineClustersLayout', entries: [
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
        ]})
        const computePipelineClusters       = new ComputePipeline(this,'clusters.comp.wgsl',
        this.device.createPipelineLayout({
            bindGroupLayouts:[this.sizeBindGroupLayout.layout, computePipelineClustersLayout]
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
            window.cancelAnimationFrame(this.renderFrame)
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

                    this.scale.x = canvas.width / entry.contentRect.width;
                    this.scale.y = canvas.height / entry.contentRect.height;
                    // configure() must also be called if you want to change the size of the textures returned by getCurrentTexture()
                    context.configure({
                        device: this.device,
                        format: this.presentationFormat,
                        usage: GPUTextureUsage.RENDER_ATTACHMENT
                    })
                    const commandEncoder = this.device.createCommandEncoder();
                    const passEncoder = commandEncoder.beginComputePass();
                    passEncoder.setPipeline(computePipelineClusters.pipeline);
                    
                    this.projections.forEach(projection => projection.update(aspectRatio))

                    this.renderPasses.forEach(renderPass => {
                        renderPass.resize(canvas.width, canvas.height);
                        passEncoder.setBindGroup(0, renderPass.sizeBindGroup());
                        renderPass.cameras.forEach(camera => {
                            camera.updateProjection(passEncoder,computePipelineClustersLayout)
                        });
                    });
                    passEncoder.end();
                    this.device.queue.submit([commandEncoder.finish()]);

                    this.renderFrame = window.requestAnimationFrame(this.renderLoop);
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
            Atomics.store(this.mousePosition, 0, e.clientX * this.scale.x)
            Atomics.store(this.mousePosition, 1, e.clientY * this.scale.y)
            Atomics.notify(new Int32Array(this.#mousePositionBuffer), 0);
        });
    }
    readonly #queue_map = new Map<number, number>();
    readonly exported_functions = {
        handle_gpu_queue:(pointerVec:number, length:number) => {
            this.GPUQueueCommandEncoder=this.device.createCommandEncoder();
            const pointers_to_gpumesh_and_alignment = new Uint32Array(engine.memory.buffer, pointerVec, length * 2);
            for (let i = 0; i < pointers_to_gpumesh_and_alignment.length; i += 2) {
                this.#queue_map.set(pointers_to_gpumesh_and_alignment[i]!, pointers_to_gpumesh_and_alignment[i + 1]!);
            }
            let tempOffset = 0;
    
            Buffer.create(this, dataSizeBytes * this.#queue_map.size, [GPUBufferUsage.COPY_SRC],'handle_gpu_queue', (tempBuffer, gpu2) => {
                this.#queue_map.forEach((alignment, gpumeshPointer) => {
                    const data = new Float32Array(engine.memory.buffer, gpumeshPointer, MainNode.GPUDataSize);
                    //Point light
                    if (data[29]! > 0) {
                        engine.updateLights = true;
                    }
                    new Float32Array(tempBuffer.getMappedRange(tempOffset * dataSizeBytes, dataSizeBytes)).set(data);
                    gpu2.GPUMeshes.copyFrom(this.GPUQueueCommandEncoder!, tempBuffer, tempOffset++ * dataSizeBytes, gpu2.gpu_memory_index_size + alignment * 256, dataSizeBytes)
                });
                this.#queue_map.clear();
                gpu2.tempGPUBuffers.push(tempBuffer);    
            });
        },
         //TODO: Queue this call and do it only once per frame
        updateAllocatedMemory:(allocated_gpu_memory_ptr:number, length:number) => {
            const renderEncoder = this.device.createCommandEncoder();
            const buffLength = Uint32Array.BYTES_PER_ELEMENT * length;
            const tempBuffer = Buffer.create(this, buffLength, [GPUBufferUsage.COPY_SRC],'tempBuffer', tempBuffer2 => {
                new Uint32Array(tempBuffer2.getMappedRange(0, buffLength)).set(new Uint32Array(engine.rust.memory.buffer, allocated_gpu_memory_ptr, length));
            });
            tempBuffer.copyTo(renderEncoder, this.GPUMeshes,0, 0, buffLength);
        },
        update_directional_lights:(pointer:number, length:number) => {
            const lights = new Uint32Array(engine.memory.buffer, pointer, length);
            const commandEncoder = this.device.createCommandEncoder();
            //TODO: Potential buffer overflow
            const byteLength = 4 + lights.byteLength;
            const tempBuffer = Buffer.create(this, byteLength, [GPUBufferUsage.COPY_SRC], 'directional_lights_tempBuffer', tempBuffer2 => {
                const gpu_buffer=new Uint32Array(tempBuffer2.getMappedRange());
                gpu_buffer[0] = lights.length;
                gpu_buffer.set(lights,1);
            });
            tempBuffer.copyTo(commandEncoder, this.GPUDirectionalLights, 0, 0, byteLength);
            this.pendingCommandBuffers.add(commandEncoder.finish());
        },
        update_point_lights:(pointer:number, length:number) => {
            const lights = new Uint32Array(engine.memory.buffer, pointer, length);
            const commandEncoder = this.device.createCommandEncoder();
            //TODO: Potential buffer overflow
            const byteLength = 4 + lights.byteLength;
            const tempBuffer = Buffer.create(this, byteLength, [GPUBufferUsage.COPY_SRC], 'point_lights_tempBuffer', tempBuffer2 => {
                const gpu_buffer=new Uint32Array(tempBuffer2.getMappedRange());
                gpu_buffer[0] = lights.length;
                gpu_buffer.set(lights,1);
            });
            tempBuffer.copyTo(commandEncoder, this.GPUPointLights,0,0,byteLength);
            this.pendingCommandBuffers.add(commandEncoder.finish());
        }
    }
    readonly #timeAndDeltaBuffer = new ArrayBuffer(8);
    readonly deltaView = new Float32Array(this.#timeAndDeltaBuffer, 4, 1);
    readonly #timeView = new Uint32Array(this.#timeAndDeltaBuffer, 0, 1);

    readonly renderLoop = (time: DOMHighResTimeStamp) => {
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



        this.GPUQueueCommandEncoder=null;
        engine.rust.renderloop();
        //@ts-ignore bug in TS
        const commandBuff= this.GPUQueueCommandEncoder?.finish() ?? null;
        if(commandBuff)
            this.pendingCommandBuffers.add(commandBuff);

        if (engine.inputManager?.checkInputs()) {
            if(engine.inputManager.calculateCameraPositionAndTarget)
            engine.inputManager.calculateCameraPositionAndTarget();
        }

        const renderEncoder = this.device.createCommandEncoder();

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
            const lightPass = renderEncoder.beginComputePass();
            lightPass.setPipeline(this.updateViewPipeline.pipeline);
            lightPass.setBindGroup(0, this.updateViewBindGroup);
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

            this.renderPasses.forEach(renderPass => {
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
        engine.renderFrame = window.requestAnimationFrame(this.renderLoop);
    }
    /*
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
                bgt.subBindGroups.forEach(b => { drawedMeshes += this.drawBindGroups(renderPassEncoder, b, renderPass, ++index) });
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
                    //subPipelineLayot.renderPipeLines.forEach(renderPipeline => {
                    //    drawedMeshes += renderPipeline.draw(renderPassEncoder, renderPass, index + dynamicIndices.length, dynamicIndices);
                    //});
                    drawedMeshes += this.drawBindGroups2(renderPassEncoder, subPipelineLayot, renderPass, pipelineLayout.bindGroupLayout.dynamicIndices?index:++index, dynamicIndices)
                    
                });
            }
        }
        return drawedMeshes;
    }
    */
}