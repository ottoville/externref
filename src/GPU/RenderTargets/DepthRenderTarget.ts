import type { RenderPass } from "../RenderPasses/RenderPass";
import type { GPUTextureUsageLiterals } from "../Texture";
import { RenderTarget, RenderTargetOptions } from "./RenderTarget.js";

export class DepthRenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends GPUTextureUsageLiterals[] = GPUTextureUsageLiterals[]> extends RenderTarget<F, U> {
    //TODO: limit format to depth formats
    static createForRenderpass<U extends ['RENDER_ATTACHMENT'], F extends GPUTextureFormat>(format: F, usages: U, label: string, clearValue: number, options?: RenderTargetOptions, writeMask?: GPUColorWriteFlags, context?: GPUCanvasContext, initialSampleCount?: 1 | 4): (renderPass: RenderPass) => DepthRenderTarget<F, U>
    static createForRenderpass<U extends ['TEXTURE_BINDING' | 'RENDER_ATTACHMENT', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT'], F extends GPUTextureFormat>(format: F, usages: U, label: string, clearValue: number, options?: RenderTargetOptions, writeMask?: GPUColorWriteFlags, context?: GPUCanvasContext, initialSampleCount?: 1 | 4): (renderPass: RenderPass) => DepthRenderTarget<F, U>
    static createForRenderpass<U extends ['TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC'], F extends GPUTextureFormat>(format: F, usages: U, label: string, clearValue: number, options?: RenderTargetOptions, writeMask?: GPUColorWriteFlags, context?: GPUCanvasContext, initialSampleCount?: 1 | 4): (renderPass: RenderPass) => DepthRenderTarget<F, U>
    static createForRenderpass<U extends ['RENDER_ATTACHMENT' | 'COPY_SRC', 'RENDER_ATTACHMENT' | 'COPY_SRC'], F extends GPUTextureFormat>(format: F, usages: U, label: string, clearValue: number, options?: RenderTargetOptions, writeMask?: GPUColorWriteFlags, context?: GPUCanvasContext, initialSampleCount?: 1 | 4): (renderPass: RenderPass) => DepthRenderTarget<F, U>
    static createForRenderpass<U extends GPUTextureUsageLiterals[] = GPUTextureUsageLiterals[], F extends GPUTextureFormat = GPUTextureFormat>(
        format: F,
        usages: U,
        label: string,
        clearValue: number,
        options: RenderTargetOptions = {size: [300,300,1]},
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext,
        initialSampleCount: 1 | 4 = 1
    ) {
        return (renderPass: RenderPass) => {
            return new DepthRenderTarget<F, U>(clearValue, format, usages, label, renderPass, options, writeMask, context, initialSampleCount)
        }
    }
    constructor(
        public clearValue: number,
        format: F,
        usages: U,
        label: string,
        renderPass: RenderPass,
        options: RenderTargetOptions = {size: [300,300,1]},
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext,
        initialSampleCount: 1 | 4 = 1
    ) {
        super(format, usages, 'renderTarget_' + label + '_texture', renderPass, options, writeMask, context, initialSampleCount);
    }
}