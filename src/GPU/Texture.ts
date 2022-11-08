import type { GPU } from "../GPU.js";
import type { TextureView } from "./TextureView.js";



export type TextureSize = {
    readonly width: GPUIntegerCoordinate;
} | {
    readonly width: GPUIntegerCoordinate;
    readonly height: GPUIntegerCoordinate;
} | {
    readonly width: GPUIntegerCoordinate;
    readonly height: GPUIntegerCoordinate;
    readonly depthOrArrayLayers: GPUIntegerCoordinate;
}

export type TextureParams<F, U> = {
    gpu: GPU;
    format: F;
    usages: U;
    label: string;
    size: TextureSize;
    initialSampleCount?: 1 | 4;
}

/*
    Cannot use const enum because TS would allow any number to enum https://stackoverflow.com/a/53496839
*/
export const RenderTargetTextureUsage = {
    RENDER_ATTACHMENT : GPUTextureUsage.RENDER_ATTACHMENT as 16,
    "RENDER_ATTACHMENT|COPY_SRC" : (GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT) as 17,
    "RENDER_ATTACHMENT|TEXTURE_BINDING" : (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT) as 20,
    "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC" : (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC) as 21,
    "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST" : (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST) as 22,
    "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC" : (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC) as 23,
    "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC|STORAGE_BINDING" : (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING) as 31

} as const
export const TextureUsage = {
    COPY_DST : GPUTextureUsage.COPY_DST as 2,
    COPY_SRC : GPUTextureUsage.COPY_SRC as 1,
    STORAGE_BINDING : GPUTextureUsage.STORAGE_BINDING as 8,
    TEXTURE_BINDING : GPUTextureUsage.TEXTURE_BINDING as 4,
    ...RenderTargetTextureUsage
} as const

type ValueOf<T> = T[keyof T];
export type TextureUsageValue = ValueOf<typeof TextureUsage>

export class Texture<
    F extends GPUTextureFormat = GPUTextureFormat,
    U extends TextureUsageValue = TextureUsageValue
> {
    texture: GPUTexture;
    views: Set<TextureView> = new Set();
    resize(size: TextureSize, sampleCount: 1 | 4) {
        this.size = size;
        this.createTexture(sampleCount);
    }
    destroy() {
        //Texture is undefined on initial call from constructor
        if (!this.texture)
            return
        this.texture.destroy();
        this.views.forEach(view => view.destroy());
    }
    protected createTexture(sampleCount: 1 | 4 = 1, debug = false) {
        //Texture is undefined on initial call
        if (this.texture)
            this.destroy();
        let usages = this.usages as number;
        if (debug) {
            usages |= GPUTextureUsage['COPY_SRC'];
        }
        this.texture = this.gpu.device.createTexture({
            size: this.size,
            sampleCount: sampleCount,
            format: this.format,
            usage: usages,
            label: this.label + (debug ? 'debug' : '')
        });
        this.views.forEach(view => view.reCreate(debug));

        return this.texture;
    }
    protected gpu: GPU;
    public format: F;
    protected usages: U;
    public label: string;
    public size: TextureSize;
    protected initialSampleCount: 1 | 4 = 1

    constructor(
        {
            gpu,
            format,
            usages,
            label,
            size,
            initialSampleCount = 1
        }: TextureParams<F, U>
    ) {
        this.gpu = gpu;
        this.format = format;
        this.usages = usages;
        this.label = label;
        this.size = size;
        this.initialSampleCount = initialSampleCount
        this.texture = this.createTexture(initialSampleCount);
    }

}