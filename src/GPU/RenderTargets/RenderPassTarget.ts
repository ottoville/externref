import { TextureView } from "../TextureView.js";
import { Texture2D, type Texture2DParams } from "../Texture2D.js";
import { RenderTarget, RenderTargetTextureUsageValue } from "./RenderTarget.js";

export type RenderPassTargetOptions = {
    textureViewDescriptor: GPUTextureViewDescriptor | undefined,   
    writeMask: GPUColorWriteFlags;
    context: GPUCanvasContext | undefined;
}
export class RenderPassTarget<
F extends GPUTextureFormat = GPUTextureFormat,
U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue>
    extends RenderTarget<F, U>
{
    public view: TextureView<Texture2D<F, U>>;
    constructor(
        textureOptions: Texture2DParams<F, U>,
        public renderTargetOptions: RenderPassTargetOptions
    ) {
        super(textureOptions);
        this.view = new TextureView(this, renderTargetOptions.textureViewDescriptor)

    }
}

