import { GPUTextureUsageLiterals, Texture } from "./texture";
import type { Engine } from "../engine.js";
import { TextureView } from "./TextureView.js";
declare const engine:Engine;

export class RenderTarget<T extends Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> {

    view: TextureView;
    constructor(
        public readonly texture: T,
        public loadValue: GPULoadOp | GPUColor,
        textureViewDescriptor?: GPUTextureViewDescriptor,
        public writeMask: GPUColorWriteFlags = 0xF
    ) {
        this.view = new TextureView(texture, textureViewDescriptor);

    }
    get viewOrResolve(): GPUTextureView {
        return this.view.resolveView ?? this.view.view;
    }

    createColorAttachment() {
        const obj:GPURenderPassColorAttachment = {
            view: this.view.view,
            loadValue:this.loadValue,
            storeOp: "store"
        }
        if(this.view.resolveView) {
            obj.resolveTarget = this.view.resolveView;
            obj.storeOp = "discard"
        }
        return obj;
    }
}
export class SwapRenderTarget<T extends Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> extends RenderTarget<T> {
    constructor(
        texture: T,
        loadValue: GPULoadOp | GPUColor,
        textureViewDescriptor?: GPUTextureViewDescriptor,
        writeMask: GPUColorWriteFlags = 0xF
    ) {
        super(texture, loadValue, textureViewDescriptor, writeMask);
    }
    
    override createColorAttachment() {
        if(this.texture.resolveTexture) {
            var obj:GPURenderPassColorAttachment = {
                view: this.view.view,
                loadValue: this.loadValue,
                resolveTarget: engine.gpu.context.getCurrentTexture().createView(),
                storeOp: "discard",
            }            
        } else {
            var obj:GPURenderPassColorAttachment = {
                view:engine.gpu.context.getCurrentTexture().createView(),
                loadValue:this.loadValue,
                storeOp: "store"
            }
        }
        return obj
    }
}