import type { RenderTargetTextureUsageValue, TextureParams, TextureUsageType } from '../Texture.js';
import { RenderPassTarget, type RenderPassTargetOptions, type Texture2dSize } from './RenderPassTarget.js';

export type ColorRenderTargetParams = {
    clearValue: GPUColor,
    blend: GPUBlendState | undefined,
}

export class ColorRenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue>
    extends RenderPassTarget<F, U>
{
    #clearValue: GPUColor;
    public blend: GPUBlendState | undefined
    constructor(
        textureOptions: TextureParams<F, Exclude<U, TextureUsageType['STORAGE_BINDING']>, Texture2dSize>,
        renderTargetOptions: RenderPassTargetOptions,
        options: ColorRenderTargetParams
    ) {
        super(textureOptions,
            renderTargetOptions);
        this.#clearValue = options.clearValue
        this.blend = options.blend
    }

    //TODO: Do not re-create on every render?
    createColorAttachment() {
        const obj:GPURenderPassColorAttachment = {
            clearValue: this.#clearValue,
            loadOp: 'clear',
            storeOp: 'store',
            view: this.renderTargetOptions.context ? this.renderTargetOptions.context.getCurrentTexture().createView() : this.view.view,
        }
        return obj;
    }
}

