import type { GPU } from "../GPU.js";
import type { TextureView } from "./TextureView.js";

export type GPUTextureUsageLiterals = 'COPY_SRC' | 'COPY_DST' | 'TEXTURE_BINDING' | 'STORAGE_BINDING' | 'RENDER_ATTACHMENT';

export class Texture<F extends GPUTextureFormat = GPUTextureFormat, U extends GPUTextureUsageLiterals[] = GPUTextureUsageLiterals[]> {
    texture: GPUTexture;
    views: Set<TextureView> = new Set();
    resize(width: number, height: number, sampleCount: 1 | 4) {
        this.size[0] = width;
        this.size[1] = height;
        this.createTexture(sampleCount);
    }
    protected destroy() {
        //Texture is undefined on initial call from constructor
        if (!this.texture)
            return
        this.texture.destroy();
        this.views.forEach(view => view.destroy());
    }
    protected createTexture(sampleCount: 1 | 4 = 1, debug = false) {
        //Texture is undefined on initial call
        if(this.texture)
            this.destroy();
        let usages = this.usages.reduce((prev, curr) => prev | GPUTextureUsage[curr], 0);
        if (debug) {
            usages |= GPUTextureUsage['COPY_SRC'];
        }
        this.texture = this.gpu.device.createTexture({
            size: this.size,
            sampleCount: sampleCount,
            format: this.format,
            usage: usages,
            label: this.label+(debug?'debug':'')
        });
        this.views.forEach(view => view.reCreate(debug));

        return this.texture;
    }
    static create<U extends ['TEXTURE_BINDING'], F extends GPUTextureFormat>(gpu: GPU, format: F, usages: U, label: string, size?: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate]): Texture<F, U>
    static create<U extends ['RENDER_ATTACHMENT'], F extends GPUTextureFormat>(gpu: GPU, format: F, usages: U, label: string, size?: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate]): Texture<F, U>
    static create<U extends ['TEXTURE_BINDING' | 'RENDER_ATTACHMENT', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT'], F extends GPUTextureFormat>(gpu: GPU, format: F, usages: U, label: string, size?: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate]): Texture<F, U>
    static create<U extends ['TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC'], F extends GPUTextureFormat>(gpu: GPU, format: F, usages: U, label: string, size?: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate]): Texture<F, U>
    static create<F extends GPUTextureFormat>(gpu: GPU, format: F, usages: GPUTextureUsageLiterals[], label: string, size: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate] = [300, 300, 1]): Texture<F, GPUTextureUsageLiterals[]> {
        return new Texture(gpu, format, usages, label, size)
    }
    constructor(
        public gpu: GPU,
        public format: F,
        public usages: U,
        public label: string,
        public readonly size: [number, number, number] = [300, 300, 1],
        public initialSampleCount: 1 | 4 = 1

    ) {
        this.texture = this.createTexture(initialSampleCount);
    }

}