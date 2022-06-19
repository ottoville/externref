import { RenderTarget } from "./RenderTarget.js";
import type { GPUTextureUsageLiterals, Texture } from "../Texture.js";
import { TextureView } from "../TextureView.js";
import { RenderPass } from "../RenderPass.js";

export class MSAARenderTarget<T extends Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>>
extends RenderTarget<T> {
    resolveView: () => GPUTextureView;
    #resolveView?: TextureView;
    constructor(
        texture: T,
        clearValue: GPUColor,
        textureViewDescriptor?: GPUTextureViewDescriptor,
        writeMask: GPUColorWriteFlags = 0xF,
        context?: GPUCanvasContext
    ) {
        super(texture, clearValue, textureViewDescriptor, writeMask,context);
        if(!context) {
            const resolved = this.texture.createResolveTexture();
            const resolveView = new TextureView(resolved, textureViewDescriptor);
            this.#resolveView = resolveView;
            this.resolveView = () => {
                return resolveView.view;
            }
        } else {
            this.resolveView = () => {
                return context.getCurrentTexture().createView();
            }
        }   
    }
    override createColorAttachment() {
        const obj=super.createColorAttachment();
        obj.view = this.view.view;
        obj.resolveTarget = this.resolveView();
        obj.storeOp = "discard"
        return obj;
    }
    override viewOrResolve(renderPass: RenderPass): GPUTextureView {
        this.#resolveView?.texture.renderPasses.add(renderPass);
        return this.resolveView()
    }
}