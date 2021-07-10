import { Texture } from "./texture";
//@ts-ignore
export class RenderTarget<T extends GPUTexture> {

    constructor(
        public readonly texture: Texture<GPUTextureFormat>,
        public loadValue: GPULoadOp | GPUColor,
    ) {

    }
    
}