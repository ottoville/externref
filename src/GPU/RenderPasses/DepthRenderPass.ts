import type { PipelineLayout } from "../PipelineLayout.js";
import type { RenderTarget } from "../RenderTargets/RenderTarget.js";
import { type GPUTextureUsageLiterals, Texture } from "../Texture.js";
import { TextureView } from "../TextureView.js";
import { RenderPass } from "./RenderPass.js";
import { type GPU } from "../../GPU.js";
import type { RenderPipeline } from "../RenderPipeline.js";

export class DepthRenderPass<T extends {
    [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>>;
} = {
    [index: string]: RenderTarget<Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>>;
}
    > extends RenderPass<T> {
    depthTexture: Texture<GPUTextureFormat, ['RENDER_ATTACHMENT', 'COPY_SRC', 'TEXTURE_BINDING']>;
    depthTextureView: TextureView;
    #depthFormat: GPUTextureFormat = 'depth32float';
    constructor(gpu: GPU,
        renderTargets: T,
        sampleCount: 1 | 4,
        size: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate],
        _onResize: (width: number, height: number) => [number, number],
        entryPoint: string,
        rootLayout: PipelineLayout,
        label: string) {
        super(gpu, renderTargets, sampleCount, size, _onResize, entryPoint, rootLayout, label);
        this.depthTexture = new Texture(gpu, this.#depthFormat, ['RENDER_ATTACHMENT', 'COPY_SRC', 'TEXTURE_BINDING'], 'depthTexture' + label, this.size, sampleCount)
        this.depthTextureView = new TextureView(this.depthTexture);
    }
    override resize(width: number, height: number) {
        super.resize(width, height);
        this.depthTexture.size[0] = this.size[0];
        this.depthTexture.size[1] = this.size[1];
        this.depthTexture.createTexture(this.sampleCount);
    }
    override get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        const renderPassDescriptor = super.GPURenderPassDescriptor;
        renderPassDescriptor.depthStencilAttachment = {
            view: this.depthTextureView.view,
            depthClearValue: 0.0,
            depthLoadOp: 'clear',
            depthStoreOp: "store"
        }
        return renderPassDescriptor;
    }
    override get GPURenderBundleEncoderDescriptor(): GPURenderBundleEncoderDescriptor {
        return {
            colorFormats: Object.values(this.renderTargets).map(rt => rt.texture.format),
            sampleCount: this.sampleCount,
            label: this.label,
            depthStencilFormat: this.#depthFormat
        }
    }
    override onDecoratePipeline(renderpipeline: Readonly<RenderPipeline>) {
        return {
            ...super.onDecoratePipeline(renderpipeline),
            depthStencil: {
                depthWriteEnabled: renderpipeline.depthBuffer?.depthWriteEnabled ?? true,
                depthCompare: renderpipeline.depthBuffer?.depthCompare ?? 'greater',
                format: this.#depthFormat
            }
        }
    }
}