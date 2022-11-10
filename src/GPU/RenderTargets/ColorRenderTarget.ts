import { type RenderTargetTextureUsageValue } from "./RenderTarget.js";
import { Texture2DParams } from "../Texture2D.js";
import { RenderPassTarget, RenderPassTargetOptions } from "./RenderPassTarget.js";

export type ColorRenderTargetParams = {
    clearValue: GPUColor,
    blend: GPUBlendState | undefined, 
}

export class ColorRenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue>
    extends RenderPassTarget<F, U>
{
    static createForRenderpass<U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue, F extends GPUTextureFormat = GPUTextureFormat>(
        textureOptions:Texture2DParams<F, U>,
        clearValue: GPUColor,
        textureViewDescriptor?: GPUTextureViewDescriptor,
        blend?:GPUBlendState,
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext

    ) {
        return () => {
            const options: ColorRenderTargetParams = {
                clearValue,
                blend
            }
            return new ColorRenderTarget<F, U>(textureOptions, 
                {
                    writeMask,
                    context,
                    textureViewDescriptor,
                }, options)
        }
    }
    #clearValue: GPUColor;
    public blend: GPUBlendState | undefined
    constructor(
        textureOptions: Texture2DParams<F, U>,
        renderTargetOptions: RenderPassTargetOptions,
        options: ColorRenderTargetParams
    ) {
        super(textureOptions, renderTargetOptions);
        this.#clearValue = options.clearValue
        this.blend = options.blend
    }

    //TODO: Do not re-create on every render?
    createColorAttachment() {
        const obj:GPURenderPassColorAttachment = {
            view: this.renderTargetOptions.context ? this.renderTargetOptions.context.getCurrentTexture().createView() : this.view.view,
            clearValue: this.#clearValue,
            loadOp: "clear",
            storeOp: "store"
        }
        return obj;
    }
    
}

