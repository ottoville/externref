import type { Scene } from "../Scene.js";
import type { TerraCamera } from "../TerraCamera.js";
import type { GPU } from "../GPU.js";
import type { RenderPipeline } from "./RenderPipeline.js";
import type { Drawable } from "./Drawable.js";
import { RenderTarget } from "./RenderTarget.js";
import { PipelineLayout } from "./PipelineLayout.js";
import { GPUTextureUsageLiterals, Texture } from "./texture.js";
import { TerraVector3 } from "../Math.js";
import type { Engine } from "engine.js";
import { MainNode } from "../MainNode.js";
declare const engine:Engine;

interface RenderPipelineVariant2 {
    renderpipeline: GPURenderPipeline;
    drawables: Map<Scene, Set<Drawable>>
    rootDrawables: Set<Drawable>
}
export class RenderPass<T extends { [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> } = { [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> }> {
    cameras: Set<TerraCamera> = new Set();
    scenes: Set<Scene> = new Set();
    #depthTextureView?: GPUTextureView
    #depthFormat: GPUTextureFormat = 'depth32float';
    bundles: GPURenderBundle[] = [];
    renderPipelines: Map<RenderPipeline, RenderPipelineVariant2> = new Map();
    depthTexture?: Texture<GPUTextureFormat, ("COPY_SRC" | "RENDER_ATTACHMENT")[]>;
    constructor(
        public gpu: GPU,
        public renderTargets: T,
        public sampleCount = 1,
        depthStencil = false,
        public size: [GPUIntegerCoordinate,GPUIntegerCoordinate,GPUIntegerCoordinate],
        private _onResize: (width: number, height: number) => [number, number]) {
        for (const rt of Object.values(renderTargets)) {
            rt.texture.renderPasses.add(this);
            rt.texture.size[0]=this.size[0];
            rt.texture.size[1]=this.size[1];
            rt.texture.createTexture();
        }

        if (depthStencil) {
            this.depthTexture = new Texture(gpu,this.#depthFormat,this.sampleCount,['RENDER_ATTACHMENT', 'COPY_SRC'],this.size)
           //TODO use renderTarget class
            this.#depthTextureView = this.depthTexture.createView()[1];
        }
    }
    getVariant(renderPipeline:RenderPipeline) {
        let variant = this.renderPipelines.get(renderPipeline)
        if (!variant) {
            const renderpipeline = this.decoratePipeline(renderPipeline);
            variant = {
                renderpipeline: renderpipeline,
                drawables: new Map(),
                rootDrawables: new Set()
            }
            this.renderPipelines.set(renderPipeline, variant)
        }
        return variant;
    }
    decoratePipeline(renderpipeline: RenderPipeline): GPURenderPipeline {
        const renderPipelineDescriptor = renderpipeline.renderPipelineDescriptor as GPURenderPipelineDescriptor;
        renderPipelineDescriptor.vertex = renderpipeline.vertexShader;
        renderPipelineDescriptor.fragment = {
            ...renderpipeline.fragmentShader,
            targets: Object.values(this.renderTargets).map(rt => {
                return {
                    format: rt.texture.format,
                    writeMask:rt.writeMask
                }
            })
        };
        if (this.depthTexture) {
            renderPipelineDescriptor.depthStencil= {
                depthWriteEnabled:renderpipeline.depthBuffer?.depthWriteEnabled ?? true,
                depthCompare:renderpipeline.depthBuffer?.depthCompare ?? 'greater',
                format: this.#depthFormat
            }
        }
             
        if (this.sampleCount > 1)
            renderPipelineDescriptor.multisample = { count: this.sampleCount };
        return this.gpu.device.createRenderPipeline(renderPipelineDescriptor)
    }
    onResize:Set<()=>void>=new Set();
    resize(width: number, height: number) {
        [this.size[0], this.size[1]] = this._onResize(width, height);
        if (this.depthTexture) {
            this.depthTexture.size[0]=this.size[0];
            this.depthTexture.size[1]=this.size[1];
            this.depthTexture.createTexture();
            this.#depthTextureView = this.depthTexture.createView()[1];
        }
        for (const key in this.renderTargets) {
            this.renderTargets[key]!.texture.size[0]=this.size[0];
            this.renderTargets[key]!.texture.size[1]=this.size[1];
            this.renderTargets[key]!.texture.createTexture();
        }
        this.onResize.forEach(cb => cb());
    }
    get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        const colorAttachments: GPURenderPassColorAttachment[] = []
        if (typeof this.renderTargets.swap !== 'undefined') {
            colorAttachments.push(this.sampleCount > 1 ? {
                view: this.renderTargets.swap.view,
                resolveTarget: this.gpu.context.getCurrentTexture().createView(),
                loadValue: this.renderTargets.swap.loadValue,
                storeOp: "store"
            } : {
                view: this.gpu.context.getCurrentTexture().createView(),
                loadValue: this.renderTargets.swap.loadValue,
                storeOp: "store"
            });

            for (const key in this.renderTargets) {
                if (key === 'swap')
                    continue;
                colorAttachments.push({
                    view: this.renderTargets[key]!.view,
                    loadValue: this.renderTargets[key]!.loadValue,
                    storeOp: "store" as const,
                })
            }
        } else {
            colorAttachments.push(...Object.values(this.renderTargets).map(rendertarget => {
                return {
                    view: rendertarget.view,
                    loadValue: rendertarget.loadValue,
                    storeOp: "store" as const,
                }
            }));
        }
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments,
        }
        if (this.#depthTextureView) {
            renderPassDescriptor.depthStencilAttachment = {
                view: this.#depthTextureView,
                depthLoadValue: 0.0,
                depthStoreOp: "store",
                stencilLoadValue: 0,
                stencilStoreOp: "store",
            }
        }
        return renderPassDescriptor;
    }
 
    render(renderEncoder: GPUCommandEncoder, rootBindGroup: GPUBindGroup | ((renderPass: RenderPass) => GPUBindGroup), rootLayout: PipelineLayout) {
        const passEncoder = renderEncoder.beginRenderPass(this.GPURenderPassDescriptor);
        if (!this.bundles.length) {
            const renderDesc:GPURenderBundleEncoderDescriptor= {
                colorFormats: Object.values(this.renderTargets).map(rt => rt.texture.format),
                sampleCount: this.sampleCount,
            }
            if(this.depthTexture) {
                renderDesc.depthStencilFormat=this.#depthFormat;
            }
            const renderBundleEncoder = this.gpu.device.createRenderBundleEncoder(renderDesc);
            //@ts-ignore
            let drawedMeshes = 0;
            const dynamicIndices: number[] = [];

            renderBundleEncoder.setBindGroup(0, typeof (rootBindGroup) === 'function' ? rootBindGroup(this) : rootBindGroup);
            rootLayout.renderPipeLines.forEach(renderPipeline => {
                drawedMeshes += renderPipeline.draw(renderBundleEncoder, this, 1);
            });
            //POSITION
            if (this.gpu.positionBindGroupTimeWGSL.bindGroupLayout.dynamicIndices) {
                dynamicIndices.push(1);
            }
            this.gpu.positionBindGroupTimeWGSL.renderPipeLines.forEach(renderPipeline => {
                drawedMeshes += renderPipeline.draw(renderBundleEncoder, this, 1, dynamicIndices);
            });
            this.gpu.positionBindGroupTimeWGSL.subBindGroups.forEach(pipelineLayout => {
                if (pipelineLayout.sharedBindgroup) {
                    renderBundleEncoder.setBindGroup(2, pipelineLayout.sharedBindgroup);
                }
                pipelineLayout.renderPipeLines.forEach(renderPipeline => {
                    drawedMeshes += renderPipeline.draw(renderBundleEncoder, this, 1 + dynamicIndices.length, dynamicIndices);
                });
            });
            dynamicIndices.length = 0;
            //SUN
            if (this.gpu.positionBindGroupTime.bindGroupLayout.dynamicIndices) {
                dynamicIndices.push(1);
            }
            this.gpu.positionBindGroupTime.renderPipeLines.forEach(renderPipeline => {
                drawedMeshes += renderPipeline.draw(renderBundleEncoder, this, 1, dynamicIndices);
            });
            this.gpu.positionBindGroupTime.subBindGroups.forEach(bindGroup => {
                bindGroup.renderPipeLines.forEach(renderPipeline => {
                    drawedMeshes += renderPipeline.draw(renderBundleEncoder, this, 1 + dynamicIndices.length, dynamicIndices);
                });
            });

            this.bundles.push(renderBundleEncoder.finish());
        }
        passEncoder.executeBundles(this.bundles);
        passEncoder.endPass();
    }
}

export class PickableRenderPass<T extends { [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> } = { [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> }> extends RenderPass<T> {
    pickBuffer: GPUBuffer;
    constructor(gpu: GPU,
        renderTargets: T,
        sampleCount = 1,
        depthStencil = false,
        size: [GPUIntegerCoordinate,GPUIntegerCoordinate,GPUIntegerCoordinate],
        _onResize: (width: number, height: number) => [number, number]) {
            super(gpu,renderTargets,sampleCount,depthStencil,size,_onResize);
            this.pickBuffer = this.gpu.device.createBuffer({
                size: this.size[0] * this.size[1] * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            });
    }
    override resize(width: number, height: number) {
        super.resize(width, height);

        //update picking
        const oldpickBuffer=this.pickBuffer;
        if(oldpickBuffer) {
            setTimeout(() => {
                oldpickBuffer.destroy();
            },1000);
        }
        this.pickBuffer = this.gpu.device.createBuffer({
            size: this.size[0] * this.size[1] * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        this.onResize.forEach(cb => cb());
    }

    pickPromise: Promise<{ position: TerraVector3 } | null> | null = null;
    pickPromiseMesh: Promise<{ position: TerraVector3, meshId: number } | null> | null = null;
    

    pickPosition(): Promise<{ position: TerraVector3 } | null>
    pickPosition(mesh:true): Promise<{ position: TerraVector3, meshId: number } | null>
    pickPosition(mesh=false): Promise<{ position: TerraVector3 } | null> | Promise<{ position: TerraVector3, meshId: number } | null> {
        if (mesh && this.pickPromiseMesh) {
            return this.pickPromiseMesh
        }
        else if (!mesh && this.pickPromise) {
            return this.pickPromise
        }
        const camera = [...this.cameras][0]!;
        const offset = (engine.mousePosition[1] * this.size[0] + engine.mousePosition[0]) * 4;
        const padding = offset % 16;

        const buffer=this.pickBuffer;

        const encoder = this.gpu.device.createCommandEncoder();
        encoder.copyTextureToBuffer(
            {
                texture: this.depthTexture!.texture,
                aspect: "depth-only",
                origin: { x: 0, y: 0, z: 0 }
            },
            {
                buffer,
                bytesPerRow: this.size[0] * 4,
                offset: 0
            },
            [this.size[0], this.size[1]]
        );
        if(mesh) {
            encoder.copyTextureToBuffer(
                {
                    texture: this.renderTargets.gRenderTargetNormals!.texture.texture,
                    origin: { x: engine.mousePosition[0], y: engine.mousePosition[1], z: 0 }
                },
                {
                    buffer,
                    bytesPerRow: 256,
                    offset: offset - padding + 32
                },
                [1, 1, 1]
            );
        }

        this.gpu.device.queue.submit([encoder.finish()]);
        
        const promise = buffer.mapAsync(GPUMapMode.READ,offset - padding,padding + 32 + 16).then(() => {
            const b = buffer.getMappedRange(offset - padding,padding + 32 + 16);
            const z = new DataView(b).getFloat32(padding, true);
            if(z === 0) { // Z is 0 when did not hit anything, far plane value
                return null;
            }
            const result = new TerraVector3();
            const x = engine.mousePosition[0] / this.size[0] * 2 - 1;
            const y = -(engine.mousePosition[1] / this.size[1] * 2 - 1);
            new TerraVector3([x, y, z]).multiply2Ref(camera.projectionViewInverted, result);


            if(mesh) {
                this.pickPromiseMesh = null;
                const meshId = new DataView(b).getUint32(32 + 12, true); //mesh id is after normals vec3
                buffer.unmap();
                return { position: result, meshId };
            } else
                this.pickPromise = null;

            buffer.unmap();
            return { position: result };
        });
        //Calculate inverted matrix while buffer is mapping
        if (camera.projectionViewInvertedIsDirty) {
            camera.projectionViewArr.invertToRef(camera.projectionViewInverted);
            camera.projectionViewInvertedIsDirty = false;
        }
        if(mesh) {
            this.pickPromiseMesh=promise as Promise<{
                position: TerraVector3;
                meshId: number;
            }>;
            return this.pickPromiseMesh;
        }
        else {
            this.pickPromise=promise;
            return this.pickPromise;
        }
    }
    async pickMesh(wantedMeshIds?: Set<number>, predicate?: (mesh: MainNode) => boolean): Promise<{ position: TerraVector3, mesh: MainNode } | null> {
        const pickInfo = await this.pickPosition(true);
        if (!pickInfo || (wantedMeshIds && !wantedMeshIds.has(pickInfo.meshId))) {
            return null;
        }
        else {
            const mesh = MainNode.Meshes.get(pickInfo.meshId);
            if (!mesh) {
                throw ('Mesh not found');
            }
            if (predicate && !predicate(mesh)) {
                return null;
            } else {
                return { position: pickInfo.position, mesh };
            }
        }
    }
}