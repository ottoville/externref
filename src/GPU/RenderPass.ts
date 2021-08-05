import type { Scene } from "../Scene.js";
import type { TerraCamera } from "../TerraCamera.js";
import type { GPU } from "../GPU.js";
import type { RenderPipeline } from "./RenderPipeline.js";
import type { Drawable } from "./Drawable.js";
import { RenderTarget } from "./RenderTarget.js";
import { PipelineLayout } from "./PipelineLayout.js";
import { GPUTextureUsageLiterals, Texture } from "./texture.js";

interface RenderPipelineVariant2 {
    renderpipeline: GPURenderPipeline;
    drawables: Map<Scene, Set<Drawable>>
    rootDrawables: Set<Drawable>
}
export class RenderPass<T extends { [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> } = { [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> }> {
    cameras: Set<TerraCamera> = new Set();
    scenes: Set<Scene> = new Set();
    #depthTextureView?: GPUTextureView
    #depthTexture?: GPUTexture
    #depthFormat: GPUTextureFormat = 'depth32float'; //depth32float
    bundles: GPURenderBundle[] = [];
    renderPipelines: Map<RenderPipeline, RenderPipelineVariant2> = new Map();
    #renderPassDescriptor: Partial<GPURenderPassDescriptor> = {
        colorAttachments: undefined,
        depthStencilAttachment: undefined
    }
    constructor(
        public gpu: GPU,
        public renderTargets: T,
        public sampleCount: number = 1,
        depthStencil = false,
        public size: [GPUIntegerCoordinate,GPUIntegerCoordinate,GPUIntegerCoordinate],
        private _onResize: (width: number, height: number) => [number, number],
        private usage: number = 0) {
        for (const key in renderTargets) {
            renderTargets[key]!.texture.renderPasses.add(this);
            renderTargets[key]!.texture.size[0]=this.size[0];
            renderTargets[key]!.texture.size[1]=this.size[1];
            renderTargets[key]!.texture.createTexture();
        }

        if (depthStencil) {
            this.#depthTexture = this.createTexture(this.#depthFormat);
            this.#depthTextureView = this.#depthTexture.createView();
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
        if (!this.#depthTexture)
            renderPipelineDescriptor.depthStencil = undefined
        else {
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

    private createTexture(format: GPUTextureFormat) {
        return this.gpu.device.createTexture({
            size: this.size,
            sampleCount: this.sampleCount,
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | this.usage //: GPUTextureUsage.OUTPUT_ATTACHMENT | GPUTextureUsage.SAMPLED
        });
    }

    onResize(width: number, height: number) {
        [this.size[0], this.size[1]] = this._onResize(width, height);
        this.cameras.forEach(camera => camera.onResize(this.size[0], this.size[1]));
        if (this.#depthTexture) {
            this.#depthTexture.destroy();
            this.#depthTexture = this.createTexture(this.#depthFormat);
            this.#depthTextureView = this.#depthTexture.createView();
        }
        for (const key in this.renderTargets) {
            this.renderTargets[key]!.texture.size[0]=this.size[0];
            this.renderTargets[key]!.texture.size[1]=this.size[1];
            this.renderTargets[key]!.texture.createTexture();
        }
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
        if (this.#depthTextureView) {
            this.#renderPassDescriptor.depthStencilAttachment = {
                view: this.#depthTextureView,
                depthLoadValue: 0.0,
                depthStoreOp: "store",
                stencilLoadValue: 0,
                stencilStoreOp: "store",
            }
        }
        this.#renderPassDescriptor.colorAttachments = colorAttachments;
        return this.#renderPassDescriptor as GPURenderPassDescriptor;
    }

    render(renderEncoder: GPUCommandEncoder, rootBindGroup: GPUBindGroup | ((renderPass: RenderPass) => GPUBindGroup), rootLayout: PipelineLayout) {
        const passEncoder = renderEncoder.beginRenderPass(this.GPURenderPassDescriptor);
        if (!this.bundles.length) {
            const renderBundleEncoder = this.gpu.device.createRenderBundleEncoder({
                colorFormats: Object.values(this.renderTargets).map(rt => rt.texture.format),
                sampleCount: this.sampleCount,
                depthStencilFormat: this.#depthTexture ? this.#depthFormat : undefined
            });
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