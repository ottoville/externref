import { Texture } from "./texture";
export class RenderTarget<T extends Texture<GPUTextureFormat>> {

    constructor(
        public readonly texture: T,
        public loadValue: GPULoadOp | GPUColor,
    ) {

    }
    
}