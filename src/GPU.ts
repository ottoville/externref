import { MainNode } from "./MainNode.js";
import { DepthRenderPass, PickableRenderPass, RenderPass } from "./GPU/RenderPass.js";
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

/*type CopyBuffers<T> = {
    [K in keyof T]: (GPUMapReadBuffer & GPUCopyDSTBuffer)
};*/
export class GPU {
    static bindMap:WeakMap<GPUBindingResource, BindGroup[]> = new WeakMap();

    readonly gpu_memory_index_size=256;
    readonly gpu_screen_buffer_size= 16; //screen width and height and ratio
    readonly gpu_max_point_lights=63;

    readonly GPUBindGroupLayouts: WeakMap<GPUBindGroup, BindGroupLayout<GPUBindGroupEntry[]>> = new WeakMap();
    readonly #DynamicBindGroups: WeakSet<GPUBindGroup> = new WeakSet();

    readonly pendingCommandBuffers: Set<GPUCommandBuffer> = new Set();
    readonly tempGPUBuffers: Set<GPUBuffer> = new Set();
    
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

    static instance: GPU;

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

    context: GPUCanvasContext;
    updateViewPipeline:ComputePipeline;
    updateViewBindGroup: GPUBindGroup;
    readonly clustersInRow:[number,number,number]=[32, 18, 48];

    readonly clusterSizeinBytes: number;


    readonly CLUSTER_WORKGROUP_SIZE:[number,number,number] = [4, 2, 4];
    readonly CLUSTER_DISPATCH_SIZE:[number,number,number] = this.clustersInRow.map((v,i) => Math.ceil(v/this.CLUSTER_WORKGROUP_SIZE[i]!)) as [number,number,number];
   // readonly CLUSTER_DISPATCH_SIZE:[number,number,number] = [1,1,1];
    viewUniformsLayout: GPUBindGroupLayout;
    readonly uniformBindGroupLayoutWithTime: BindGroupLayout<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>;
    readonly presentationFormat: GPUTextureFormat;
    readonly shaderModules = {} as { [K in keyof typeof shaders]: GPUShaderModule }
    pickRenderPass: RenderPass<{ gRenderTargetId: RenderTarget<Texture<"r32uint", ["RENDER_ATTACHMENT", "TEXTURE_BINDING", "COPY_SRC"]>>; }>;
    sizeBindGroupLayout: BindGroupLayout<[GPUBindGroupEntry]>;
    static readonly #renderPipelines: Map<string, RenderPipeline> = new Map();
    bindGroupTextureWater: LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupTextureEntry<unknown>]>;
    static createRenderPipeline(desc:readonly [label: string, create:(hash:string,primitive: GPUPrimitiveState) => RenderPipeline], primitive: GPUPrimitiveState & { topology: 'triangle-strip' | 'line-strip', stripIndexFormat: GPUIndexFormat}): RenderPipeline
    static createRenderPipeline(desc:readonly [label: string, create:(hash:string,primitive: GPUPrimitiveState) => RenderPipeline], primitive: Omit<GPUPrimitiveState, 'stripIndexFormat'> & { topology: 'triangle-list' | 'line-list'}): RenderPipeline
    static createRenderPipeline(desc:readonly [label: string, create:(hash:string,primitive: GPUPrimitiveState) => RenderPipeline], primitive?: Omit<GPUPrimitiveState, 'topology'>): RenderPipeline
    static createRenderPipeline(desc:readonly [label: string, create:(hash:string,primitive: GPUPrimitiveState) => RenderPipeline], primitive: GPUPrimitiveState={}) {
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
            GPU.#renderPipelines.set(hash, renderPipeline);
        }
        return renderPipeline;

    }
    constructor(public canvas: HTMLCanvasElement, adapter:GPUAdapter, public device: GPUDevice) {

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
      

        const context:GPUCanvasContext | null = canvas.getContext('webgpu');
        if (!context)
            throw (new Error('Unable to get webgpu context'));
        this.context = context
        this.presentationFormat = context.getPreferredFormat(adapter);
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
            swap: new RenderTarget(canvasTexture, { r: 0.53, g: 0.8, b: 0.92, a: 1.0 },undefined, undefined,true)
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
        GPU.instance = this;
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