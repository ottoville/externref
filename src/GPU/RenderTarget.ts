import { GPUTextureUsageLiterals, Texture } from "./texture";
export class RenderTarget<T extends Texture<GPUTextureFormat, GPUTextureUsageLiterals[]>> {

    constructor(
        public readonly texture: T,
        public loadValue: GPULoadOp | GPUColor,
    ) {

    }
    
}