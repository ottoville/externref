import type { RENDER_TARGET_TEXTURE, STORAGE_BINDING_TEXTURE, TextureParams } from '../Texture.js';
import { RenderPassTarget, type RenderPassTargetOptions, type Texture2dSize } from './RenderPassTarget.js';

export class DepthRenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends RENDER_TARGET_TEXTURE = RENDER_TARGET_TEXTURE> extends RenderPassTarget<F, U> {
    //TODO: limit format to depth formats
    constructor(
        public clearValue: number,
        textureOptions: TextureParams<F, Exclude<U, STORAGE_BINDING_TEXTURE>, Texture2dSize>,
        renderTargetOptions: RenderPassTargetOptions
    ) {
        super(textureOptions,
            renderTargetOptions);
    }
}