import type { ColorRenderTarget } from '../RenderTargets/ColorRenderTarget.js';
import { RenderPass, RenderPassProps } from './RenderPass.js';
import type { DepthRenderTarget } from '../RenderTargets/DepthRenderTarget.js';
import type { RENDER_TARGET_TEXTURE } from '../Texture.js';
import type { RenderPipeline } from '../RenderPipeline.js';

export class DepthRenderPass<T extends {
    [index: string]: ColorRenderTarget<GPUTextureFormat, RENDER_TARGET_TEXTURE>;
} = {
    [index: string]: ColorRenderTarget<GPUTextureFormat, RENDER_TARGET_TEXTURE>;
}
> extends RenderPass<T> {
    depthRenderTarget: DepthRenderTarget<GPUTextureFormat, RENDER_TARGET_TEXTURE>;
    constructor(
        renderPassProps: RenderPassProps<T>,
        depthRenderTarget: DepthRenderTarget<GPUTextureFormat, RENDER_TARGET_TEXTURE>
    ) {
        renderPassProps.GPURenderBundleEncoderDescriptor = {
            depthStencilFormat: depthRenderTarget.props.format,
        };
        super(renderPassProps);
        this.depthRenderTarget = depthRenderTarget;
    }
    override resize(width: number, height: number) {
        super.resize(width,
            height);
        this.depthRenderTarget.resize(this.size,
            this.sampleCount);
    }
    override get GPURenderPassDescriptor(): GPURenderPassDescriptor {
        const renderPassDescriptor = super.GPURenderPassDescriptor;

        renderPassDescriptor.depthStencilAttachment = {
            depthClearValue: this.depthRenderTarget.clearValue,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
            view: this.depthRenderTarget.view.getAsRenderTarget(this),
        };
        return renderPassDescriptor;
    }
    override onDecoratePipeline(renderpipeline: Readonly<RenderPipeline>) {
        return {
            ...super.onDecoratePipeline(renderpipeline),
            depthStencil: {
                depthCompare: renderpipeline.props.depthBuffer?.depthCompare ?? 'greater',
                depthWriteEnabled: renderpipeline.props.depthBuffer?.depthWriteEnabled ?? true,
                format: this.depthRenderTarget.props.format,
            },
        };
    }
}