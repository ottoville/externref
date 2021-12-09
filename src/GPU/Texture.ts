import { RenderPass } from "./RenderPass.js";
import { GPU } from "../GPU.js";
import { TextureView } from "./TextureView.js";

export type GPUTextureUsageLiterals= 'COPY_SRC' | 'COPY_DST' | 'TEXTURE_BINDING' | 'STORAGE_BINDING' | 'RENDER_ATTACHMENT';

export class Texture<F extends GPUTextureFormat = GPUTextureFormat, U extends GPUTextureUsageLiterals[] = GPUTextureUsageLiterals[]> {
    texture: GPUTexture;
    views:Set<TextureView> = new Set();
    resolveViews:Set<TextureView> = new Set();
    resolveTexture?: GPUTexture;
    renderPasses: Set<RenderPass> = new Set();

    createTexture(sampleCount:1|4 = 1, debug=false) {
        
        //Texture is undefined on initial call from constructor
        if (this.texture) {
            this.texture.destroy();
            this.resolveTexture?.destroy();
            this.renderPasses.forEach(rp => {
                rp.bundles.length = 0;
                rp.renderPipelines.forEach((rpVariant, pipeline) => rpVariant.renderpipeline = rp.decoratePipeline(pipeline))
            })
        }
        let  usages=this.usages.reduce((prev, curr) => prev | GPUTextureUsage[curr], 0);
        if(debug) {
            usages|=GPUTextureUsage['COPY_SRC'];
        }
        this.texture = this.gpu.device.createTexture({
            size: this.size,
            sampleCount: sampleCount,
            format: this.format,
            usage: usages,
        });
        this.views.forEach(view => view.reCreate());

        if(sampleCount > 1 && this.createResolver) {
            this.createResolveTexture();

        }
        return this.texture;
    }
    createResolveTexture(debug=false) {   
        let usages=this.usages.reduce((prev, curr) => prev | GPUTextureUsage[curr], 0);
        if(debug) {
            usages|=GPUTextureUsage['COPY_SRC'];
        }
        this.resolveTexture = this.gpu.device.createTexture({
            size:this.size,
            sampleCount: 1,
            format:this.format,
            usage:usages,
        });
        this.resolveViews.forEach(view => view.reCreate());
    }
    static create<U extends ['TEXTURE_BINDING'], F extends GPUTextureFormat>(gpu:GPU, format: F, usages: U,size?: [GPUIntegerCoordinate,GPUIntegerCoordinate,GPUIntegerCoordinate]): Texture<F, U>
    static create<U extends ['RENDER_ATTACHMENT'], F extends GPUTextureFormat>(gpu:GPU, format: F, usages: U,size?: [GPUIntegerCoordinate,GPUIntegerCoordinate,GPUIntegerCoordinate]): Texture<F,U>
    static create<U extends ['TEXTURE_BINDING' | 'RENDER_ATTACHMENT', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT'], F extends GPUTextureFormat>(gpu:GPU, format: F, usages: U,size?: [GPUIntegerCoordinate,GPUIntegerCoordinate,GPUIntegerCoordinate]): Texture<F, U>
    static create<U extends ['TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC', 'TEXTURE_BINDING' | 'RENDER_ATTACHMENT' | 'COPY_SRC'], F extends GPUTextureFormat>(gpu:GPU, format: F, usages: U,size?: [GPUIntegerCoordinate,GPUIntegerCoordinate,GPUIntegerCoordinate]): Texture<F, U>
    static create<F extends GPUTextureFormat>(gpu:GPU, format: F, usages: GPUTextureUsageLiterals[], size: [GPUIntegerCoordinate,GPUIntegerCoordinate,GPUIntegerCoordinate] = [300,300,1]): Texture<F, GPUTextureUsageLiterals[]> {
        return new Texture(gpu, format,usages,size)
    }
    constructor(
        public gpu:GPU,
        public format: F,
        public usages: U,
        public readonly size: [number,number,number] = [300,300,1],
        private createResolver=true
        ) {
            this.texture = this.createTexture();
        }
        toBitmap(depth=0) {
            const renderPass: RenderPass | undefined = this.renderPasses.values().next().value;

            //Use for debugging purpose.
            //this.#debug = true;

            if(!renderPass || renderPass.sampleCount>1) {
                this.createResolveTexture(true);
            } else {
                this.createTexture(renderPass.sampleCount,true);
            }
            let bytes_per_fixel: number;
            switch (this.format) {
                case 'bgra8unorm':
                    bytes_per_fixel = 4;
                    break;
                case 'rgba32float':
                    bytes_per_fixel= 16;
                    break;
                case 'depth32float':
                    bytes_per_fixel = 4;
                    break;
            }
            setTimeout(() => {
                const encoder = this.gpu.device.createCommandEncoder();
                const buffer = this.gpu.device.createBuffer({
                    size: this.size[0] * this.size[1] * bytes_per_fixel,
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                })
                encoder.copyTextureToBuffer({
                    texture: this.resolveTexture ?? this.texture,
                    origin:[0,0,depth]
                },
                {
                    buffer: buffer,
                    bytesPerRow: this.size[0] * bytes_per_fixel,
                    rowsPerImage:this.size[1]
                },
                    [this.size[0], this.size[1]]);
                    this.gpu.device.queue.submit([encoder.finish()]);
                buffer.mapAsync(GPUMapMode.READ).then(() => {
                    const c = document.createElement('canvas');
                    c.width=this.size[0];
                    c.height=this.size[1];

                    const ctx = c.getContext('2d');
                    if(!ctx) {
                        throw(new Error('Cannot get context'));
                    }
                    const imageData = ctx.createImageData(c.width, c.height);
                    let data:Uint8ClampedArray;
                    if(bytes_per_fixel > 4) {
                        const floatData=new Float32Array(buffer.getMappedRange());
                        data = new Uint8ClampedArray(this.size[0] * this.size[1] * 4);
                        for(let i=0;i<data.length;i+=4) {
                            const index=i;
                            const length=Math.sqrt(floatData[index]!*floatData[index]! + floatData[index+1]!*floatData[index+1]! + floatData[index+2]!*floatData[index+2]!);
                            //const length=Math.max(floatData[index]!,floatData[index+1]!,floatData[index+2]!)
                            data[i]=(floatData[index]!/length)*255;
                            data[i+1]=(floatData[index+1]!/length)*255;
                            data[i+2]=(floatData[index+2]!/length)*255;
                            data[i+3]=255;
                        }
                    } else {
                        data = new Uint8ClampedArray(buffer.getMappedRange());
                    }
                    imageData.data.set(data);
                    buffer.unmap();
                    ctx.putImageData(imageData, 0, 0);
                    c.toBlob(b=>  {
                        if(!b) {
                            throw new Error('Blob creation failed');
                        }
                        console.log(URL.createObjectURL(b));
                        buffer.destroy();
                    },"image/jpeg",0.96);
                    
                });
                setTimeout(() => {
                    //this.#debug = false;
                    if(!renderPass || renderPass.sampleCount>1) {
                        this.createResolveTexture();
                    }
                    else {
                        this.createTexture(renderPass.sampleCount);
                    }
                }, 100)
            }, 100)
        }
}