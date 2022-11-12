import { ColorRenderTarget, ColorRenderTargetParams } from "./ColorRenderTarget.js";
import { Texture2DParams } from "../Texture2D.js";
import { RenderPassTarget, RenderPassTargetOptions } from "./RenderPassTarget.js";
import type { RenderTargetTextureUsageValue } from "../Texture.js";

export class MSAARenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue>
    extends ColorRenderTarget<F, U> {
    static override createForRenderpass<U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue, F extends GPUTextureFormat = GPUTextureFormat>(
        textureOptions:Texture2DParams<F, U>,
        clearValue: GPUColor,
        textureViewDescriptor?: GPUTextureViewDescriptor,
        blend?:GPUBlendState,
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext
    ) {
        return () => {
            const rt = new MSAARenderTarget(
                textureOptions
                , {
                    context,
                    writeMask,
                    textureViewDescriptor
                }, {
                    clearValue,
                    blend
                }
            );
            return rt;
        }
    }
    readonly resolveTexture?: RenderPassTarget<F, U>
    readonly #resolveView: () => GPUTextureView;
    constructor(
        textureOptions: Texture2DParams<F, U>,
        renderTargetOptions: RenderPassTargetOptions,
        options: ColorRenderTargetParams
    ) {
        super(textureOptions, renderTargetOptions, options);
        if (!renderTargetOptions.context) {
            const resolveTexture = new RenderPassTarget(textureOptions, renderTargetOptions);
            //const resolveTexture = new RenderTarget(this.format, this.usages, textureOptions.label, this.renderPass, { size: options.size }, undefined, undefined, undefined);
            this.resolveTexture = resolveTexture;
            //  this.#resolveView = resolveView;
            this.#resolveView = () => {
                //TODO: do not call this on every render?
                return resolveTexture.view.view;
            }
        } else {
            this.#resolveView = () => {
                return renderTargetOptions.context!.getCurrentTexture().createView();
            }
        }
    }
    override resize(size: {width: number, height: number}, sampleCount: 1 | 4) {
        super.resize(size, sampleCount);
        this.resolveTexture?.resize(size, 1)
    }
    override createColorAttachment() {
        const obj = super.createColorAttachment();
        obj.view = this.view.view;
        obj.resolveTarget = this.#resolveView();
        obj.storeOp = "discard"
        return obj;
    }
}