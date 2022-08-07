import type { PipelineLayout } from "../PipelineLayout.js";
import type { ColorRenderTarget } from "../RenderTargets/ColorRenderTarget.js";
import type { GPUTextureUsageLiterals } from "../Texture.js";
import { RenderPass } from "./RenderPass.js";
import type { GPU } from "../../GPU.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import type { DepthRenderTarget } from "GPU/RenderTargets/DepthRenderTarget.js";

export class DepthRenderPass<T extends {
    [index: string]: (renderPass: RenderPass) => ColorRenderTarget<GPUTextureFormat, GPUTextureUsageLiterals[]>;
} = {
    [index: string]: (renderPass: RenderPass) =>ColorRenderTarget<GPUTextureFormat, GPUTextureUsageLiterals[]>;
}
    > extends RenderPass<T> {
    depthRenderTarget: DepthRenderTarget<GPUTextureFormat, GPUTextureUsageLiterals[]> 
    constructor(gpu: GPU,
        renderTargetsConstructors: T,
        sampleCount: 1 | 4,
        size: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate],
        _onResize: (width: number, height: number) => [number, number],
        entryPoint: string,
        rootLayout: PipelineLayout,
        label: string,
        depthRenderTargetsConstructor: ((renderPass: RenderPass) => DepthRenderTarget<GPUTextureFormat, GPUTextureUsageLiterals[]>)) {
        super(gpu, renderTargetsConstructors, sampleCount, size, _onResize, entryPoint, rootLayout, label);
            this.depthRenderTarget=depthRenderTargetsConstructor(this);
            this.GPURenderBundleEncoderDescriptor = {
                ...this.GPURenderBundleEncoderDescriptor,
                depthStencilFormat: this.depthRenderTarget.format
        }
    }
    override resize(width: number, height: number) {
        super.resize(width, height);
        this.depthRenderTarget.resize(this.size[0], this.size[1], this.sampleCount)    
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