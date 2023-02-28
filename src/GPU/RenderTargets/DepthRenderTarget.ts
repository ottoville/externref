import type { RenderTargetTextureUsageValue } from "../Texture.js";
import type { Texture2DParams } from "../Texture2D";
import { RenderPassTarget, RenderPassTargetOptions } from "./RenderPassTarget.js";

export class DepthRenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue> extends RenderPassTarget<F, U> {
    //TODO: limit format to depth formats
    constructor(
        public clearValue: number,
        textureOptions: Texture2DParams<F, U>,
        renderTargetOptions: RenderPassTargetOptions
    ) {
        super(textureOptions, renderTargetOptions);
    }
}