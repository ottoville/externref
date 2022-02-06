import { type GPUTextureUsageLiterals, Texture } from "../Texture.js";
import { TextureView } from "../TextureView.js";
import type { Engine } from "../../engine.js";
import type { RenderPass } from "../RenderPass.js";
declare const engine:Engine;

export class RenderTarget<T extends Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> {
    view: TextureView;
    constructor(
        public readonly texture: T,
        public clearValue: GPUColor,
        textureViewDescriptor?: GPUTextureViewDescriptor,
        public writeMask: GPUColorWriteFlags = 0xF,
        protected isSwap=false
    ) {
        this.view = new TextureView(texture, textureViewDescriptor);
    }
    viewOrResolve(renderPass: RenderPass): GPUTextureView {
        this.texture.renderPasses.add(renderPass);
        return this.view.view;
    }

    createColorAttachment() {
        const obj:GPURenderPassColorAttachment = {
            view: this.isSwap ? engine.gpu.context.getCurrentTexture().createView() : this.view.view,
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

