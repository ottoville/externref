import type { ColorRenderTarget } from "../RenderTargets/ColorRenderTarget.js";
import { RenderPass, RenderPassProps } from "./RenderPass.js";
import type { DepthRenderTarget } from "../RenderTargets/DepthRenderTarget.js";
import type { RenderTargetTextureUsageValue } from "../Texture.js";
import type { RenderPipeline } from "../RenderPipeline.js";

export class DepthRenderPass<T extends {
    [index: string]: ColorRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>;
} = {
    [index: string]: ColorRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>;
}
> extends RenderPass<T> {
    depthRenderTarget: DepthRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>
    constructor(
        renderPassProps: RenderPassProps<T>,
        depthRenderTargets: DepthRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>
    ) {
        renderPassProps.GPURenderBundleEncoderDescriptor = { depthStencilFormat: depthRenderTargets.format }
        super(renderPassProps);
        this.depthRenderTarget = depthRenderTargets;
    }
    override resize(width: number, height: number) {
        super.resize(width, height);
        this.depthRenderTarget.resize(this.size, this.sampleCount)
    }
    override get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        const renderPassDescriptor = super.GPURenderPassDescriptor;

        renderPassDescriptor.depthStencilAttachment = {
            view: this.depthRenderTarget.view.getAsRenderTarget(this),
            depthClearValue: this.depthRenderTarget.clearValue,
            depthLoadOp: 'clear',
            depthStoreOp: "store"
        }
        return renderPassDescriptor;
    }
    override onDecoratePipeline(renderpipeline: Readonly<RenderPipeline>) {
        return {
            ...super.onDecoratePipeline(renderpipeline),
            depthStencil: {
                depthWriteEnabled: renderpipeline.props.depthBuffer?.depthWriteEnabled ?? true,
                depthCompare: renderpipeline.props.depthBuffer?.depthCompare ?? 'greater',
                format: this.depthRenderTarget.format
            }
        }
    }
}