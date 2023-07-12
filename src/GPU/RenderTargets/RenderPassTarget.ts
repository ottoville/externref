import { TextureView } from '../TextureView.js';
export type Texture2dSize = {
    readonly width: GPUIntegerCoordinate;
    readonly height: GPUIntegerCoordinate;
}
import { RENDER_TARGET_FORMAT, RENDER_TARGET_TEXTURE, RenderTarget, STORAGE_BINDING_TEXTURE, Texture, TextureParams } from '../Texture.js';

export type RenderPassTargetOptions = {
    textureViewDescriptor?: GPUTextureViewDescriptor | undefined,
    writeMask: GPUColorWriteFlags;
    context: GPUCanvasContext | undefined;
}
export class RenderPassTarget<
F extends RENDER_TARGET_FORMAT = RENDER_TARGET_FORMAT,
U extends RENDER_TARGET_TEXTURE = RENDER_TARGET_TEXTURE>
    extends RenderTarget<F, U>
{
    public view: TextureView<Texture<F, U, Texture2dSize>>;
    constructor(
        textureOptions: TextureParams<F, Exclude<U, STORAGE_BINDING_TEXTURE>, Texture2dSize>,
        public renderTargetOptions: RenderPassTargetOptions
    ) {
        super(textureOptions);
        this.view = new TextureView(this,
            renderTargetOptions.textureViewDescriptor);

    }
}

