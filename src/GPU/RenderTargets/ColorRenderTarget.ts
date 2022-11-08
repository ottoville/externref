import type { RenderPass } from "../RenderPasses/RenderPass.js";
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
        textureOptions:Omit<Texture2DParams<F, U>, 'gpu'>,
        clearValue: GPUColor,
        textureViewDescriptor?: GPUTextureViewDescriptor,
        blend?:GPUBlendState,
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext

    ) {
        return (renderPass: RenderPass) => {
            const options: ColorRenderTargetParams = {
                clearValue,
                blend
            }
            return new ColorRenderTarget<F, U>(textureOptions, 
                {
                    renderPass,
                    writeMask,
                    context,
                    textureViewDescriptor,
                }, options)
        }
    }
    #clearValue: GPUColor;
    public blend: GPUBlendState | undefined
    constructor(
        textureOptions: Omit<Texture2DParams<F, U>, 'gpu'>,
        renderTargetOptions: RenderPassTargetOptions,
        options: ColorRenderTargetParams
    ) {
        super({gpu: renderTargetOptions.renderPass.gpu, ...textureOptions}, renderTargetOptions);
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

