import { Texture, type TextureParams, type TextureUsageValue } from "./Texture.js";

export interface Texture2DParams<F extends GPUTextureFormat, U extends TextureUsageValue> extends TextureParams<F, U> {
    size: Texture2dSize
}
export type Texture2dSize = {
    readonly width: GPUIntegerCoordinate;
    readonly height: GPUIntegerCoordinate;
}
export class Texture2D<
F extends GPUTextureFormat = GPUTextureFormat,
U extends TextureUsageValue = TextureUsageValue
> extends Texture<F, U> {
    public override size: Texture2dSize = this.size;
    constructor(options: Texture2DParams<F, U>
    ) {
        super(options);
    }
}