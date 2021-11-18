import { RenderPass } from "./RenderPass.js";
import { GPU } from "../GPU.js";

export type GPUTextureUsageLiterals= 'COPY_SRC' | 'COPY_DST' | 'TEXTURE_BINDING' | 'STORAGE_BINDING' | 'RENDER_ATTACHMENT';

export class Texture<F extends GPUTextureFormat, U extends GPUTextureUsageLiterals[]> {
    texture: GPUTexture;
    renderPasses: Set<RenderPass> = new Set();
    views:Map<symbol, GPUTextureView> = new Map();
    createView(descriptor?: GPUTextureViewDescriptor):[symbol, GPUTextureView] {
        const view = this.texture.createView(descriptor);
        const s=Symbol()
        this.views.set(s, view);
        return [s, view];
    }
    createTexture(sampleCount:1|4 = 1, debug=false) {
        if (this.texture) {
            this.texture.destroy();
            this.renderPasses.forEach(rp => {
                rp.bundles.length = 0;
                rp.renderPipelines.forEach((rpVariant, pipeline) => rpVariant.renderpipeline = rp.decoratePipeline(pipeline))
            })
        }

        if (debug)
            this.usages.push('COPY_SRC');
        this.texture = this.gpu.device.createTexture({
            size:this.size,
            sampleCount:sampleCount,
            format:this.format,
            usage:this.usages.reduce((prev, curr) => prev | GPUTextureUsage[curr], 0),
        });
        this.views.clear();
        return this.texture;
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
        public readonly size: [number,number,number] = [300,300,1]) {
            this.texture = this.createTexture();
        }
        toBitmap(depth=0) {
            const renderPass: RenderPass = this.renderPasses.values().next().value;
    
            //Use for debugging purpose.
            //this.#debug = true;
            const oldSampleCount = renderPass.sampleCount;
    
            renderPass.sampleCount = 1
            this.createTexture(1,true);
            let bytes_per_fixel: number;
            switch (this.format) {
                case 'bgra8unorm':
                    bytes_per_fixel = 4;
                    break;
                case 'rgba32float':
                    bytes_per_fixel= 16
                    break;
            }
            setTimeout(() => {
                const encoder = this.gpu.device.createCommandEncoder();
                const buffer = this.gpu.device.createBuffer({
                    size: renderPass.size[0] * renderPass.size[1] * bytes_per_fixel,
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                })
                encoder.copyTextureToBuffer({
                    texture: this.texture,
                    origin:[0,0,depth]
                },
                {
                    buffer: buffer,
                    bytesPerRow: renderPass.size[0] * bytes_per_fixel,
                    rowsPerImage:renderPass.size[1]
                },
                    [renderPass.size[0], renderPass.size[1]]);
                    this.gpu.device.queue.submit([encoder.finish()]);
                buffer.mapAsync(GPUMapMode.READ).then(() => {
                    const c = document.createElement('canvas');
                    c.width=renderPass.size[0];
                    c.height=renderPass.size[1];

                    const ctx = c.getContext('2d');
                    if(!ctx) {
                        throw(new Error('Cannot get context'));
                    }
                    const imageData = ctx.createImageData(c.width, c.height);
                    let data:Uint8ClampedArray;
                    if(bytes_per_fixel > 4) {
                        const floatData=new Float32Array(buffer.getMappedRange());
                        data = new Uint8ClampedArray(renderPass.size[0] * renderPass.size[1] * 4);
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
                        console.log(URL.createObjectURL(b));
                        buffer.destroy();
                    },"image/jpeg",0.96);
                    
                });
                setTimeout(() => {
                    //this.#debug = false;
                    renderPass.sampleCount = oldSampleCount;
                    this.createTexture();
                }, 100)
            }, 100)
        }
}