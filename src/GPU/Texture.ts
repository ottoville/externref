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
let n = 0;

export const enum TextureUsageEnums {
    COPY_DST = 2,
    COPY_SRC = 1,
    STORAGE_BINDING = 8,
    TEXTURE_BINDING = 4,
    RENDER_ATTACHMENT = 16,
    "RENDER_ATTACHMENT|COPY_SRC" = 17,
    "RENDER_ATTACHMENT|TEXTURE_BINDING" = 20,
    "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC" = 21,
    "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST" = 22,
    "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC" = 23,
    "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC|STORAGE_BINDING" = 31
}
/*
    Cannot use const enum because TS would allow any number to enum https://stackoverflow.com/a/53496839
*/
interface RenderTargetTextureUsage {
    readonly RENDER_ATTACHMENT :  16,
    readonly "RENDER_ATTACHMENT|COPY_SRC" :  17,
    readonly "RENDER_ATTACHMENT|TEXTURE_BINDING" : 20,
    readonly "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_SRC" : 21,
    readonly "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST" : 22,
    readonly "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC" :23,
    readonly "RENDER_ATTACHMENT|TEXTURE_BINDING|COPY_DST|COPY_SRC|STORAGE_BINDING" : 31

}
export interface TextureUsageType extends RenderTargetTextureUsage {
    readonly COPY_DST : 2,
    readonly COPY_SRC : 1,
    readonly STORAGE_BINDING : 8,
    readonly TEXTURE_BINDING : 4,
}

type ValueOf<T> = T[keyof T];
export type TextureUsageValue = ValueOf<TextureUsageType>
export type RenderTargetTextureUsageValue = ValueOf<RenderTargetTextureUsage>

export class Texture<
    F extends GPUTextureFormat,
    U extends TextureUsageValue
> {
    texture: GPUTexture;
    views: Set<TextureView<typeof this>> = new Set();
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
        let label = this.label;
        if(debug) {
            label+='debug'+n;
            console.log('create texture', label);
            n=n+1;
        }
        //Texture is undefined on initial call
        if (this.texture)
            this.destroy();
        let usages = this.usages as number;
        if (debug) {
            usages |= GPUTextureUsage['COPY_SRC'];
        }
        if(this.size.width === 0) {
            throw new Error('Texture must have width')
        } else if('height' in this.size && this.size.height === 0) {
            throw new Error('Texture must have height')
        }
        this.texture = this.gpu.device.createTexture({
            size: this.size,
            sampleCount: sampleCount,
            format: this.format,
            usage: usages,
            label
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