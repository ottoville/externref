import type { Scene } from "../Scene.js";
import type { TerraCamera } from "../TerraCamera.js";
import type { GPU } from "../GPU.js";
import type { RenderPipeline } from "./RenderPipeline.js";
import type { Drawable } from "./Drawable.js";
import { RenderTarget } from "./RenderTarget.js";
import { BindGroupLayout } from "./BindGroupLayout.js";

interface RenderPipelineVariant2 {
    renderpipeline: GPURenderPipeline;
    drawables: Map<Scene, Set<Drawable>>
    rootDrawables: Set<Drawable>
}
export class RenderPass {
    cameras: Set<TerraCamera> = new Set();


    scenes: Set<Scene> = new Set();
    depthTextureView: GPUTextureView | undefined
    #depthTexture: GPUTexture | undefined

    bundles: GPURenderBundle[] = [];
    colorFormats: GPUTextureFormat[] = [];
    renderTargets: RenderTarget<GPUTexture>[] = []
    renderPipelines: Map<RenderPipeline, RenderPipelineVariant2> = new Map();
    swapChainAndTarget?: [GPUSwapChain, RenderTarget<GPUTexture>];

    constructor(
        public gpu: GPU,
        public sampleCount: number = 1,
        depthStencil = false,
        public size: { width: number, height: number },
        private loadValue: GPULoadOp | GPUColor,
        private _onResize: (width: number, height: number) => [number, number],
        private usage: number = 0) {
        if (depthStencil) {
            this.#depthTexture = this.createTexture("depth24plus-stencil8");
            this.depthTextureView = this.#depthTexture.createView();
        }
    }
    decoratePipeline(partialRenderPipelineDescriptor: Omit<GPURenderPipelineDescriptor, 'colorStates'>): GPURenderPipeline {
        const renderPipelineDescriptor = partialRenderPipelineDescriptor as GPURenderPipelineDescriptor;
        if (!this.#depthTexture)
            renderPipelineDescriptor.depthStencilState = undefined
        else if (!renderPipelineDescriptor.depthStencilState) {
            renderPipelineDescriptor.depthStencilState = {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus-stencil8",
            }
        }
        renderPipelineDescriptor.sampleCount = this.sampleCount;
        renderPipelineDescriptor.colorStates = this.colorFormats.map(cf => {
            return {
                format: cf
            }
        });
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
        this.bundles.length = 0;
        [this.size.width, this.size.height] = this._onResize(width, height);
        this.cameras.forEach(camera => camera.onResize(this.size.width, this.size.height));
        if (this.#depthTexture) {
            this.#depthTexture.destroy();
            this.#depthTexture = this.createTexture("depth24plus-stencil8");
            this.depthTextureView = this.#depthTexture.createView();
        }
        this.renderTargets.forEach(renderTarget => renderTarget.createTexture());
    }
    #renderPassDescriptor: Partial<GPURenderPassDescriptor> = {
        colorAttachments: undefined,
        depthStencilAttachment: undefined
    }
    addSwapChain(usages: [typeof GPUTextureUsage.SAMPLED]): RenderTarget<GPUTextureSampled>
    addSwapChain(usages: GPUTextureUsageFlags[]): RenderTarget<GPUTexture>
    addSwapChain(usages: GPUTextureUsageFlags[] = [GPUTextureUsage.RENDER_ATTACHMENT]) {
        //const rt = new RenderTarget(this, "bgra8unorm", GPUTextureUsage.RENDER_ATTACHMENT, this.sampleCount);
        const rt = this.addTarget("bgra8unorm", usages, this.sampleCount)
        this.swapChainAndTarget = [this.gpu.context.configureSwapChain({
            device: this.gpu.device,
            format: "bgra8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        }),
            rt];
        return rt;
    }
    addTarget(format: GPUTextureFormat, usages: [typeof GPUTextureUsage.SAMPLED], sampleCount: number): RenderTarget<GPUTextureSampled>
    addTarget(format: GPUTextureFormat, usages: GPUTextureUsageFlags[], sampleCount: number): RenderTarget<GPUTexture>
    addTarget(format: GPUTextureFormat, usages: GPUTextureUsageFlags[], sampleCount = 1): RenderTarget<GPUTexture> {
        const usage = usages.reduce((prev, curr) => prev | curr, GPUTextureUsage.RENDER_ATTACHMENT);
        return new RenderTarget(this, format, usage, sampleCount)
    }
    get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        const colorAttachments: GPURenderPassColorAttachmentDescriptor[] = []

        if (this.swapChainAndTarget) {
            colorAttachments.push(this.sampleCount > 1 ? {
                attachment: this.swapChainAndTarget[1].view,
                resolveTarget: this.swapChainAndTarget[0].getCurrentTexture().createView(),
                loadValue: this.loadValue
            } : {
                attachment: this.swapChainAndTarget[0].getCurrentTexture().createView(),
                loadValue: this.loadValue
            })
            colorAttachments.push(...this.renderTargets.slice(1).map(rt => {
                return {
                    attachment: rt.view,
                    loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    storeOp: "store" as const,
                }
            }))
        } else {
            colorAttachments.push(...this.renderTargets.map(rt => {
                return {
                    attachment: rt.view,
                    loadValue: this.loadValue,
                    storeOp: "store" as const,
                }
            }))
        }
        if (this.depthTextureView) {
            this.#renderPassDescriptor.depthStencilAttachment = {
                attachment: this.depthTextureView,
                depthLoadValue: 1,
                depthStoreOp: "store",
                stencilLoadValue: 0,
                stencilStoreOp: "store",
            }
        }
        this.#renderPassDescriptor.colorAttachments = colorAttachments;
        return this.#renderPassDescriptor as GPURenderPassDescriptor;
    }

    render(renderEncoder: GPUCommandEncoder, cameraBindGroup: GPUBindGroup, rootLayout: BindGroupLayout) {
        try {
            const passEncoder = renderEncoder.beginRenderPass(this.GPURenderPassDescriptor);
            if (!this.bundles.length) {
                const renderBundleEncoder = this.gpu.device.createRenderBundleEncoder({
                    colorFormats: this.colorFormats,
                    sampleCount: this.sampleCount,
                    depthStencilFormat: this.#depthTexture ? 'depth24plus-stencil8' : undefined
                });
                this.recordRenderPass(renderBundleEncoder, cameraBindGroup, rootLayout);
                this.bundles.push(renderBundleEncoder.finish());
            }
            passEncoder.executeBundles(this.bundles);
            passEncoder.endPass();
        } catch (e) {
            console.error(e);
            debugger;
        }
    }
    recordRenderPass(passEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, cameraBindGroup: GPUBindGroup, rootLayout: BindGroupLayout) {
        let drawedMeshes = 0;

        if (cameraBindGroup) {
            passEncoder.setBindGroup(0, cameraBindGroup);
            //this.gpu.rootCameralayout
            rootLayout.renderPipeLines.forEach(rp => {
                drawedMeshes += rp.draw(passEncoder, this, 1);
            });
        }
        if (rootLayout.subBindGroups.size) {
            rootLayout.subBindGroups.forEach(bgt =>
                drawedMeshes += this.gpu.drawBindGroups(passEncoder, bgt, this, 1)
            )
        };

        this.scenes.forEach(scene =>
            drawedMeshes += scene.render(passEncoder, this)
        );
        // console.log('scenes ', this.scenes.size, 'meshes', drawedMeshes);
    }
}