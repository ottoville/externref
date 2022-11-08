import { Texture2DParams } from "GPU/Texture2D";
import type { RenderPass } from "../RenderPasses/RenderPass";
import { RenderPassTarget, RenderPassTargetOptions } from "./RenderPassTarget";
import { type RenderTargetTextureUsageValue } from "./RenderTarget.js";

export class DepthRenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue> extends RenderPassTarget<F, U> {
    //TODO: limit format to depth formats
    static createForRenderpass<U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue, F extends GPUTextureFormat = GPUTextureFormat>(
        format: F,
        usages: U,
        label: string,
        clearValue: number,
        size: { width: 300, height: 300 },
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext,
        initialSampleCount: 1 | 4 = 1
    ) {
        return (renderPass: RenderPass) => {
            return new DepthRenderTarget<F, U>(clearValue,
                {
                    format,
                    usages,
                    label,
                    size,
                    initialSampleCount
                },
                {
                    renderPass,
                    writeMask,
                    context,
                    textureViewDescriptor: undefined
                }
            )
            //return new DepthRenderTarget<F, U>(clearValue, format, usages, label, renderPass, options, writeMask, context, initialSampleCount)
        }
    }
    constructor(
        public clearValue: number,
        textureOptions: Omit<Texture2DParams<F, U>, 'gpu'>,
        renderTargetOptions: RenderPassTargetOptions
    ) {
        super({gpu: renderTargetOptions.renderPass.gpu, ...textureOptions}, renderTargetOptions);
    }
}