import { GPUTextureUsageLiterals, Texture } from "./texture";
export class RenderTarget<T extends Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> {

    viewSymbol:symbol | null = null;
    constructor(
        public readonly texture: T,
        public loadValue: GPULoadOp | GPUColor,
    ) {
    }
    get view(): GPUTextureView {
        if(this.viewSymbol) {
            const view = this.texture.views.get(this.viewSymbol);
            if(view)
                return view;
        }
        const SymbolAndView = this.texture.createView();
        this.viewSymbol = SymbolAndView[0]
        return SymbolAndView[1];
    }
    
}