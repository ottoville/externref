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
export type TextureParams<F extends GPUTextureFormat, U extends Exclude<TextureUsageValue, TextureUsageType["STORAGE_BINDING"]>, S extends TextureSize> = {
    gpu: GPU;
    format: F;
    usages: U;
    label: string;
    size: S;
    initialSampleCount?: 1 | 4;
}
export type TextureParamsStorage<S extends TextureSize> = {
    gpu: GPU;
    /**
     * Allowed formats for STORAGE_BINDING see https://www.w3.org/TR/webgpu/#plain-color-formats
     */
    format: "rgba8unorm" | "rgba8snorm" | "rgba8uint" | "rgba8sint" | /* when bgra8unorm-storage is enanabled "bgra8unorm" |*/ "rgba16uint" | "rgba16sint" | "rgba16float" |
        "r32uint" | "r32sint" | "r32float" | "rg32uint" | "rg32sint" | "rg32float" | "rgba32uint" | "rgba32sint" | "rgba32float";
    usages: TextureUsageType["STORAGE_BINDING"];
    label: string;
    size: S;
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
    U extends TextureUsageValue,
    S extends TextureSize = TextureSize,
> {
    texture: GPUTexture;
    views: Set<TextureView<typeof this>> = new Set();
    protected initialSampleCount: 1 | 4 = 1;
    constructor(
        public props : TextureParams<F,Exclude<U, TextureUsageType["STORAGE_BINDING"]>,S> | TextureParamsStorage<S>
    ) {
        this.texture = this.createTexture(props.initialSampleCount);
    }
    resize(size: S, sampleCount: 1 | 4) {
        this.props.size = size;
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
        let label = this.props.label;
        if(debug) {
            label+='debug'+n;
            console.log('create texture', label);
            n=n+1;
        }
        //Texture is undefined on initial call
        if (this.texture)
            this.destroy();
        let usages = this.props.usages as number;
        if (debug) {
            usages |= GPUTextureUsage['COPY_SRC'];
        }
        if(this.props.size.width === 0) {
            throw new Error('Texture must have width')
        } else if('height' in this.props.size && this.props.size.height === 0) {
            throw new Error('Texture must have height')
        }
        this.texture = this.props.gpu.device.createTexture({
            size: this.props.size,
            sampleCount: sampleCount,
            format: this.props.format,
            usage: usages,
            label
        });
        this.views.forEach(view => view.reCreate(debug));

        return this.texture;
    }
}