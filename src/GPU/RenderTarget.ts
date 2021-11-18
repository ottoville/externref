import { GPUTextureUsageLiterals, Texture } from "./texture";
export class RenderTarget<T extends Texture<GPUTextureFormat, GPUTextureUsageLiterals[], 1|4>> {

    viewSymbol:symbol | null = null;
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
    
}