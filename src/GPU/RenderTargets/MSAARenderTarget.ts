import { ColorRenderTarget, ColorRenderTargetParams } from "./ColorRenderTarget.js";
import { RenderPass } from "../RenderPasses/RenderPass.js";
import { RenderTargetTextureUsageValue } from "./RenderTarget.js";
import { Texture2DParams } from "../Texture2D.js";
import { RenderPassTarget, RenderPassTargetOptions } from "./RenderPassTarget.js";

export class MSAARenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue>
    extends ColorRenderTarget<F, U> {
    static override createForRenderpass<U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue, F extends GPUTextureFormat = GPUTextureFormat>(
        textureOptions:Omit<Texture2DParams<F, U>, 'gpu'>,
        clearValue: GPUColor,
        textureViewDescriptor?: GPUTextureViewDescriptor,
        blend?:GPUBlendState,
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext
    ) {
        return (renderPass: RenderPass) => {
            return new MSAARenderTarget(
                textureOptions
                , {
                    renderPass,
                    context,
                    writeMask,
                    textureViewDescriptor
                }, {
                    clearValue,
                    blend
                }
            );
        }
    }
    readonly resolveTexture?: RenderPassTarget<F, U>
    readonly #resolveView: () => GPUTextureView;
    constructor(
        textureOptions: Omit<Texture2DParams<F, U>, 'gpu'>,
        renderTargetOptions: RenderPassTargetOptions,
        options: ColorRenderTargetParams
    ) {
        super(textureOptions, renderTargetOptions, options);
        if (!renderTargetOptions.context) {
            const resolveTexture = new RenderPassTarget({gpu: renderTargetOptions.renderPass.gpu, ...textureOptions}, renderTargetOptions);
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