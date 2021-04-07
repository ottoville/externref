import type { Scene } from "../Scene.js";
import type { TerraCamera } from "../TerraCamera.js";
import type { GPU } from "../GPU.js";
import type { RenderPipeline } from "./RenderPipeline.js";
import type { Drawable } from "./Drawable.js";
import { RenderTarget } from "./RenderTarget.js";
import { PipelineLayout } from "./PipelineLayout.js";

interface RenderPipelineVariant2 {
    renderpipeline: GPURenderPipeline;
    drawables: Map<Scene, Set<Drawable>>
    rootDrawables: Set<Drawable>
}
export class RenderPass<T extends {[index:string]: RenderTarget<GPUTexture>}> {
    cameras: Set<TerraCamera> = new Set();
    scenes: Set<Scene> = new Set();
    #depthTextureView: GPUTextureView | undefined
    #depthTexture: GPUTexture | undefined

    bundles: GPURenderBundle[] = [];
    colorFormats: GPUTextureFormat[] = [];
    renderPipelines: Map<RenderPipeline, RenderPipelineVariant2> = new Map();
    #swapChainAndTarget?: [GPUSwapChain, RenderTarget<GPUTexture>];
    #renderPassDescriptor: Partial<GPURenderPassDescriptor> = {
        colorAttachments: undefined,
        depthStencilAttachment: undefined
    }
    constructor(
        public gpu: GPU,
        public renderTargets: T,
        public sampleCount: number = 1,
        depthStencil = false,
        public size: { width: number, height: number },
        private _onResize: (width: number, height: number) => [number, number],
        private usage: number = 0) {
        for(const key in renderTargets) {
            this.colorFormats.push(renderTargets[key]!.format);
            renderTargets[key]!.renderPasses.add(this);
            renderTargets[key]!.writableRenderPass=this;
            renderTargets[key]!.createTexture();
        }

        if (depthStencil) {
            this.#depthTexture = this.createTexture("depth24plus-stencil8");
            this.#depthTextureView = this.#depthTexture.createView();
        }
    }
    decoratePipeline(renderpipeline: RenderPipeline): GPURenderPipeline {
        const renderPipelineDescriptor = renderpipeline.renderPipelineDescriptor as GPURenderPipelineDescriptor;
        renderPipelineDescriptor.vertex=renderpipeline.vertexShader;
        renderPipelineDescriptor.fragment={...renderpipeline.fragmentShader, targets: this.colorFormats.map(cf => {
            return {
                format: cf
            }
        })};
        if (!this.#depthTexture)
            renderPipelineDescriptor.depthStencil = undefined
        else if (!renderPipelineDescriptor.depthStencil) {
            renderPipelineDescriptor.depthStencil = {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus-stencil8",
            }
        }
        if(this.sampleCount > 1)
            renderPipelineDescriptor.multisample= { count: this.sampleCount};

        return this.gpu.device.createRenderPipeline(renderPipelineDescriptor)
    }

    private createTexture(format: GPUTextureFormat) {
        return this.gpu.device.createTexture({
            size: this.size,
            sampleCount: this.sampleCount,
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | this.usage //: GPUTextureUsage.OUTPUT_ATTACHMENT | GPUTextureUsage.SAMPLED
        });
    };

    onResize(width: number, height: number) {
        [this.size.width, this.size.height] = this._onResize(width, height);
        this.cameras.forEach(camera => camera.onResize(this.size.width, this.size.height));
        if (this.#depthTexture) {
            this.#depthTexture.destroy();
            this.#depthTexture = this.createTexture("depth24plus-stencil8");
            this.#depthTextureView = this.#depthTexture.createView();
        }
        for(const key in this.renderTargets) {
            this.renderTargets[key]!.createTexture();
        }
    }

    addSwapChain(loadValue: GPULoadOp | GPUColor,usages?: [typeof GPUTextureUsage.SAMPLED]): RenderTarget<GPUTextureSampled>
    addSwapChain(loadValue: GPULoadOp | GPUColor,usages?: GPUTextureUsageFlags[]): RenderTarget<GPUTexture>
    addSwapChain(loadValue: GPULoadOp | GPUColor,usages: GPUTextureUsageFlags[] = [GPUTextureUsage.RENDER_ATTACHMENT]) {
        const rt = this.addTarget("bgra8unorm", usages,loadValue, this.sampleCount);
        this.colorFormats.push(rt.format);
        rt.renderPasses.add(this);
        rt.writableRenderPass=this;
        rt.createTexture();
        //@ts-expect-error
        this.renderTargets.swap=rt;
        this.#swapChainAndTarget = [this.gpu.context.configureSwapChain({
            device: this.gpu.device,
            format: "bgra8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        }),
            rt];
        return rt;
    }
    addTarget(format: GPUTextureFormat, usages: [typeof GPUTextureUsage.SAMPLED],loadValue: GPULoadOp | GPUColor, sampleCount: number): RenderTarget<GPUTextureSampled>
    addTarget(format: GPUTextureFormat, usages: GPUTextureUsageFlags[],loadValue: GPULoadOp | GPUColor, sampleCount: number): RenderTarget<GPUTexture>
    addTarget(format: GPUTextureFormat, usages: GPUTextureUsageFlags[],loadValue: GPULoadOp | GPUColor, sampleCount = 1): RenderTarget<GPUTexture> {
        const usage = usages.reduce((prev, curr) => prev | curr, GPUTextureUsage.RENDER_ATTACHMENT);
        return new RenderTarget(this.gpu, format, loadValue, usage, sampleCount)
    }
    get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        const colorAttachments: GPURenderPassColorAttachmentDescriptor[] = []

        if (this.#swapChainAndTarget) {
            colorAttachments.push(this.sampleCount > 1 ? {
                attachment: this.#swapChainAndTarget[1].view,
                resolveTarget: this.#swapChainAndTarget[0].getCurrentTexture().createView(),
                loadValue: this.#swapChainAndTarget[1].loadValue
            } : {
                attachment: this.#swapChainAndTarget[0].getCurrentTexture().createView(),
                loadValue: this.#swapChainAndTarget[1].loadValue
            });
            
            for(const key in this.renderTargets) {
                if(key === 'swap')
                    continue;
                colorAttachments.push({
                    attachment: this.renderTargets[key]!.view,
                    loadValue: this.renderTargets[key]!.loadValue,
                    storeOp: "store" as const,
                })
            }
        } else {
            for(const key in this.renderTargets) {
                colorAttachments.push({
                    attachment: this.renderTargets[key]!.view,
                    loadValue: this.renderTargets[key]!.loadValue,
                    storeOp: "store" as const,
                })
            }
        }
        if (this.#depthTextureView) {
            this.#renderPassDescriptor.depthStencilAttachment = {
                attachment: this.#depthTextureView,
                depthLoadValue: 1,
                depthStoreOp: "store",
                stencilLoadValue: 0,
                stencilStoreOp: "store",
            }
        }
        this.#renderPassDescriptor.colorAttachments = colorAttachments;
        return this.#renderPassDescriptor as GPURenderPassDescriptor;
    }

    render(renderEncoder: GPUCommandEncoder, rootBindGroup: GPUBindGroup | ((renderPass:RenderPass<{}>) => GPUBindGroup), rootLayout: PipelineLayout) {
        try {
            const passEncoder = renderEncoder.beginRenderPass(this.GPURenderPassDescriptor);
            if (!this.bundles.length) {
                const renderBundleEncoder = this.gpu.device.createRenderBundleEncoder({
                    colorFormats: this.colorFormats,
                    sampleCount: this.sampleCount,
                    depthStencilFormat: this.#depthTexture ? 'depth24plus-stencil8' : undefined
                });

                let drawedMeshes = 0;
                renderBundleEncoder.setBindGroup(0, typeof(rootBindGroup)==='function'?rootBindGroup(this):rootBindGroup);
                rootLayout.renderPipeLines.forEach(renderPipeline => {
                    drawedMeshes += renderPipeline.draw(renderBundleEncoder, this, 1);
                });
                rootLayout.subBindGroups.forEach(pipelineLayoyt =>
                    drawedMeshes += this.gpu.drawBindGroups(renderBundleEncoder, pipelineLayoyt, this, 1)
                )

                this.bundles.push(renderBundleEncoder.finish());
            }
            passEncoder.executeBundles(this.bundles);
            passEncoder.endPass();
        } catch (e) {
            console.error(e);
            debugger;
        }
    }
}