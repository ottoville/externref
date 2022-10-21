import { ColorRenderTarget } from "./ColorRenderTarget.js";
import type { GPUTextureUsageLiterals } from "../Texture.js";
import { RenderPass } from "../RenderPasses/RenderPass.js";
import { RenderTarget, RenderTargetOptions } from "./RenderTarget.js";

export class MSAARenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends GPUTextureUsageLiterals[] = GPUTextureUsageLiterals[]>
    extends ColorRenderTarget<F, U> {
    static override createForRenderpass<U extends ['RENDER_ATTACHMENT'], F extends GPUTextureFormat>(format: F, usages: U, label: string, clearValue: GPUColor, options?: RenderTargetOptions, blend?:GPUBlendState, writeMask?: GPUColorWriteFlags, context?: GPUCanvasContext): (renderPass: RenderPass) => MSAARenderTarget<F, U>
    static override createForRenderpass<U extends ['TEXTURE_BINDING' | 'RENDER_ATTACHMENT', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT'], F extends GPUTextureFormat>(format: F, usages: U, label: string, clearValue: GPUColor, options?: RenderTargetOptions, blend?:GPUBlendState, writeMask?: GPUColorWriteFlags, context?: GPUCanvasContext): (renderPass: RenderPass) => MSAARenderTarget<F, U>
    static override createForRenderpass<U extends ['TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC'], F extends GPUTextureFormat>(format: F, usages: U, label: string, clearValue: GPUColor, options?: RenderTargetOptions, blend?:GPUBlendState, writeMask?: GPUColorWriteFlags, context?: GPUCanvasContext): (renderPass: RenderPass) => MSAARenderTarget<F, U>
    static override createForRenderpass<U extends GPUTextureUsageLiterals[] = GPUTextureUsageLiterals[], F extends GPUTextureFormat = GPUTextureFormat>(
        format: F,
        usages: U,
        label: string,
        clearValue: GPUColor,
        options: RenderTargetOptions = {size: [300,300,1]},
        blend?:GPUBlendState,
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext
    ) {
        return (renderPass: RenderPass) => {
            return new MSAARenderTarget(clearValue, format, usages, label, renderPass, options, blend, writeMask, context)
        }
    }
    readonly resolveTexture?: RenderTarget<F, U>
    readonly #resolveView: () => GPUTextureView;
    constructor(
        clearValue: GPUColor,
        format: F,
        usages: U,
        label: string,
        renderPass: RenderPass,
        options: RenderTargetOptions = { size: [300,300,1] },
        blend?:GPUBlendState,
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext
    ) {
        super(clearValue, format, usages, label, renderPass, options, blend, writeMask, context);
        if (!context) {
            const resolveTexture = new RenderTarget(this.format, this.usages, this.label + 'Resolve' + Date.now(), this.renderPass, { size: options.size }, undefined, undefined, undefined);
            this.resolveTexture = resolveTexture;
            //  this.#resolveView = resolveView;
            this.#resolveView = () => {
                //TODO: do not call this on every render?
                return resolveTexture.view.view;
            }
        } else {
            this.#resolveView = () => {
                return context.getCurrentTexture().createView();
            }
        }
    }
    override resize(width: number, height: number, sampleCount: 1 | 4) {
        super.resize(width, height, sampleCount);
        this.resolveTexture?.resize(width, height, 1)
    }
    override createColorAttachment() {
        const obj = super.createColorAttachment();
        obj.view = this.view.view;
        obj.resolveTarget = this.#resolveView();
        obj.storeOp = "discard"
        return obj;
    }
}