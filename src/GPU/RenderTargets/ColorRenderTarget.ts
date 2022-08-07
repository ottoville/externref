import type { GPUTextureUsageLiterals } from "../Texture.js";
import type { RenderPass } from "../RenderPasses/RenderPass.js";
import { RenderTarget } from "./RenderTarget.js";

export class ColorRenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends GPUTextureUsageLiterals[] = GPUTextureUsageLiterals[]>
    extends RenderTarget<F, U>
{
    static createForRenderpass<U extends ['RENDER_ATTACHMENT'], F extends GPUTextureFormat>(format: F, usages: U, label: string, clearValue: GPUColor, size?: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate], textureViewDescriptor?: GPUTextureViewDescriptor, writeMask?: GPUColorWriteFlags, context?: GPUCanvasContext,initialSampleCount?: 1 | 4 ): (renderPass: RenderPass) => ColorRenderTarget<F, U>
    static createForRenderpass<U extends ['TEXTURE_BINDING' | 'RENDER_ATTACHMENT', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT'], F extends GPUTextureFormat>(format: F, usages: U, label: string,clearValue: GPUColor,  size?: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate], textureViewDescriptor?: GPUTextureViewDescriptor, writeMask?: GPUColorWriteFlags, context?: GPUCanvasContext,initialSampleCount?: 1 | 4): (renderPass: RenderPass) => ColorRenderTarget<F, U>
    static createForRenderpass<U extends ['TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC'], F extends GPUTextureFormat>(format: F, usages: U, label: string,clearValue: GPUColor, size?: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate], textureViewDescriptor?: GPUTextureViewDescriptor, writeMask?: GPUColorWriteFlags, context?: GPUCanvasContext,initialSampleCount?: 1 | 4): (renderPass: RenderPass) => ColorRenderTarget<F, U>
    static createForRenderpass<U extends GPUTextureUsageLiterals[] = GPUTextureUsageLiterals[], F extends GPUTextureFormat = GPUTextureFormat>(
        format: F,
        usages: U,
        label: string,
        clearValue: GPUColor,
        size: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate] = [300, 300, 1],
        textureViewDescriptor?: GPUTextureViewDescriptor,
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext

    ) {
        return (renderPass: RenderPass) => {
            return new ColorRenderTarget<F, U>(clearValue, format, usages, label, renderPass, size, textureViewDescriptor, writeMask, context)
        }
    }
    
    constructor(
        public clearValue: GPUColor,
        format: F,
        usages: U,
        label: string,
        renderPass: RenderPass,
        size: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate] = [300, 300, 1],
        textureViewDescriptor?: GPUTextureViewDescriptor,
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext,
        initialSampleCount: 1 | 4 = 1
    ) {
        super(format,usages,'ColorRenderTarget_'+label,renderPass, size,textureViewDescriptor, writeMask,context,initialSampleCount);
    }

    //TODO: Do not re-create on every render?
    createColorAttachment() {
        const obj:GPURenderPassColorAttachment = {
            view: this.context ? this.context.getCurrentTexture().createView() : this.view.view,
            clearValue: this.clearValue,
            loadOp: "clear",
            storeOp: "store"
        }
        return obj;
    }
    
}

