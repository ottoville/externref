import type { ColorRenderTarget } from "../RenderTargets/ColorRenderTarget.js";
import { RenderPass, RenderPassProps } from "./RenderPass.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import type { DepthRenderTarget } from "../RenderTargets/DepthRenderTarget.js";
import type { RenderTargetTextureUsageValue } from "../RenderTargets/RenderTarget.js";

export class DepthRenderPass<T extends {
    [index: string]: (renderPass: RenderPass) => ColorRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>;
} = {
    [index: string]: (renderPass: RenderPass) =>ColorRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>;
}
    > extends RenderPass<T> {
    depthRenderTarget: DepthRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue> 
    constructor(
        renderPassProps: RenderPassProps<T> ,
        depthRenderTargetsConstructor: ((renderPass: RenderPass) => DepthRenderTarget<GPUTextureFormat, RenderTargetTextureUsageValue>)
        ) {
        super(renderPassProps);
            this.depthRenderTarget=depthRenderTargetsConstructor(this);
            this.GPURenderBundleEncoderDescriptor = {
                ...this.GPURenderBundleEncoderDescriptor,
                depthStencilFormat: this.depthRenderTarget.format
        }
    }
    override resize(width: number, height: number) {
        super.resize(width, height);
        this.depthRenderTarget.resize(this.size, this.sampleCount)    
    }
    override get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        const renderPassDescriptor = super.GPURenderPassDescriptor;
        renderPassDescriptor.depthStencilAttachment = {
            view: this.depthRenderTarget.view.view,
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
                depthWriteEnabled: renderpipeline.depthBuffer?.depthWriteEnabled ?? true,
                depthCompare: renderpipeline.depthBuffer?.depthCompare ?? 'greater',
                format: this.depthRenderTarget.format
            }
        }
    }
}