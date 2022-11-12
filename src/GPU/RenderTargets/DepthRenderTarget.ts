import type { RenderTargetTextureUsageValue } from "../Texture.js";
import type { Texture2DParams } from "../Texture2D";
import { RenderPassTarget, RenderPassTargetOptions } from "./RenderPassTarget.js";

export class DepthRenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue> extends RenderPassTarget<F, U> {
    //TODO: limit format to depth formats
    static createForRenderpass<U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue, F extends GPUTextureFormat = GPUTextureFormat>(
        textureOptions: Texture2DParams<F, U>,
        clearValue: number,
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext,
    ) {
        return () => {
            return new DepthRenderTarget<F, U>(clearValue,
                textureOptions,
                {
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
        textureOptions: Texture2DParams<F, U>,
        renderTargetOptions: RenderPassTargetOptions
    ) {
        super(textureOptions, renderTargetOptions);
    }
}