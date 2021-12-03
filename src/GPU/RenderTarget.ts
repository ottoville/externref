import { GPUTextureUsageLiterals, Texture } from "./texture";
import type { Engine } from "engine.js";
declare const engine:Engine;

export class RenderTarget<T extends Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> {
    viewSymbol:symbol | null = null;
    resolveTargetViewSymbol:symbol | null = null;
    constructor(
        public readonly texture: T,
        public loadValue: GPULoadOp | GPUColor,
        private textureViewDescriptor?: GPUTextureViewDescriptor,
        public writeMask: GPUColorWriteFlags = 0xF
    ) {
    }
    get view(): GPUTextureView {
        if(this.viewSymbol) {
            const view = this.texture.views.get(this.viewSymbol);
            if(view)
                return view;
        }
        const SymbolAndView = this.texture.createView(this.textureViewDescriptor);
        this.viewSymbol = SymbolAndView[0]
        return SymbolAndView[1];
    }
    get resolveTargetView(): GPUTextureView {
        if(this.resolveTargetViewSymbol) {
            const view = this.texture.resolveViews.get(this.resolveTargetViewSymbol);
            if(view)
                return view;
        }
        const SymbolAndView = this.texture.createResolveView(this.textureViewDescriptor);
        this.viewSymbol = SymbolAndView[0]
        return SymbolAndView[1];
    }
    get viewOrResolve(): GPUTextureView {
        if(this.texture.resolveTexture) {
            return this.resolveTargetView;
        }
        return this.view;
    }

    createColorAttachment() {
        const obj:GPURenderPassColorAttachment = {
            view:this.view,
            loadValue:this.loadValue,
            storeOp:"store"
        }
        if(this.texture.resolveTexture) {
            obj.resolveTarget = this.resolveTargetView;
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
                view:this.view,
                loadValue:this.loadValue,
                storeOp:"store",
                resolveTarget: this.resolveTargetView
            }            
        } else {
            var obj:GPURenderPassColorAttachment = {
                view:engine.gpu.context.getCurrentTexture().createView(),
                loadValue:this.loadValue,
                storeOp:"store"
            }
        }
        return obj
    }
}