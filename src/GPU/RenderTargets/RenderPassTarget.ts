import { TextureView } from '../TextureView.js';
export type Texture2dSize = {
    readonly width: GPUIntegerCoordinate;
    readonly height: GPUIntegerCoordinate;
}
import { RenderTarget, RenderTargetTextureUsageValue, Texture, TextureParams, TextureUsageType } from '../Texture.js';

export type RenderPassTargetOptions = {
    textureViewDescriptor?: GPUTextureViewDescriptor | undefined,
    writeMask: GPUColorWriteFlags;
    context: GPUCanvasContext | undefined;
}
export class RenderPassTarget<
F extends GPUTextureFormat = GPUTextureFormat,
U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue>
    extends RenderTarget<F, U>
{
    public view: TextureView<Texture<F, U, Texture2dSize>>;
    constructor(
        textureOptions: TextureParams<F, Exclude<U, TextureUsageType['STORAGE_BINDING']>, Texture2dSize>,
        public renderTargetOptions: RenderPassTargetOptions
    ) {
        super(textureOptions);
        this.view = new TextureView(this,
            renderTargetOptions.textureViewDescriptor)

    }
}

