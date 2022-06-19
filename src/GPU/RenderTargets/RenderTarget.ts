import { type GPUTextureUsageLiterals, Texture } from "../Texture.js";
import { TextureView } from "../TextureView.js";
import type { RenderPass } from "../RenderPass.js";

export class RenderTarget<T extends Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> {
    view: TextureView;
    constructor(
        public readonly texture: T,
        public clearValue: GPUColor,
        textureViewDescriptor?: GPUTextureViewDescriptor,
        public writeMask: GPUColorWriteFlags = 0xF,
        protected context?: GPUCanvasContext
    ) {
        this.view = new TextureView(texture, textureViewDescriptor);
    }
    viewOrResolve(renderPass: RenderPass): GPUTextureView {
        this.texture.renderPasses.add(renderPass);
        return this.view.view;
    }

    createColorAttachment() {
        const obj:GPURenderPassColorAttachment = {
            view: this.context ? this.context.getCurrentTexture().createView() : this.view.view,
            clearValue: this.clearValue,
            loadOp: "clear",
            storeOp: "store"
        }
        return obj;
    }
    resize(renderPass: RenderPass) {
        this.texture.resize(renderPass.size[0], renderPass.size[1], renderPass.sampleCount)
    }
}

