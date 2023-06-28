import type { RenderTargetTextureUsageValue, TextureParams, TextureUsageType } from '../Texture.js';
import { RenderPassTarget, type RenderPassTargetOptions, type Texture2dSize } from './RenderPassTarget.js';

export class DepthRenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue> extends RenderPassTarget<F, U> {
    //TODO: limit format to depth formats
    constructor(
        public clearValue: number,
        textureOptions: TextureParams<F, Exclude<U, TextureUsageType['STORAGE_BINDING']>, Texture2dSize>,
        renderTargetOptions: RenderPassTargetOptions
    ) {
        super(textureOptions,
            renderTargetOptions);
    }
}