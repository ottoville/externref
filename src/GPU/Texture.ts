import { RenderPass } from "./RenderPass.js";
import { GPU } from "../GPU.js";
import { TextureView } from "./TextureView.js";

export type GPUTextureUsageLiterals= 'COPY_SRC' | 'COPY_DST' | 'TEXTURE_BINDING' | 'STORAGE_BINDING' | 'RENDER_ATTACHMENT';

export class Texture<F extends GPUTextureFormat = GPUTextureFormat, U extends GPUTextureUsageLiterals[] = GPUTextureUsageLiterals[]> {
    texture: GPUTexture;
    views:Set<TextureView> = new Set();
    renderPasses: Set<RenderPass> = new Set();
    resolveTexture?: Texture<F, U>
    createResolveTexture():Texture<F, U> {
        const texture=new Texture(this.gpu, this.format, this.usages);
        texture.renderPasses = this.renderPasses;
        this.resolveTexture=texture;
        return texture;
    }
    resize(width: number, height: number, sampleCount: 1|4) {
        this.size[0] = width;
        this.size[1] = height;
        this.createTexture(sampleCount);
        this.resolveTexture?.resize(width, height, 1)
    }
    createTexture(sampleCount:1|4 = 1, debug=false) {
        //Texture is undefined on initial call from constructor
        if (this.texture) {
            this.texture.destroy();
            this.renderPasses.forEach(rp => {
                rp.bundles.length = 0;
                rp.renderPipelines.forEach((rpVariant, pipeline) => rpVariant.renderpipeline = rp.decoratePipeline(pipeline))
            })
        }
        let  usages=this.usages.reduce((prev, curr) => prev | GPUTextureUsage[curr], 0);
        if(debug) {
            usages |= GPUTextureUsage['COPY_SRC'];
        }
        this.texture = this.gpu.device.createTexture({
            size: this.size,
            sampleCount: sampleCount,
            format: this.format,
            usage: usages,
        });
        this.views.forEach(view => view.reCreate());

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
        public readonly size: [number,number,number] = [300,300,1],
        
        ) {
            this.texture = this.createTexture();
        }
        static toBitmap(abstractTexture:Texture, depth=0) {
            const texture = abstractTexture.resolveTexture ?? abstractTexture;

            const renderPass: RenderPass | undefined = texture.renderPasses.values().next().value;
            if(renderPass && renderPass.sampleCount > 1 && !abstractTexture.resolveTexture) {
                throw(new Error('Printing MSAA swap target is not supported'))
            }

            //Use for debugging purpose.
            //this.#debug = true;

            texture.createTexture(1,true);
            let bytes_per_fixel: number;
            switch (texture.format) {
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
                const encoder = texture.gpu.device.createCommandEncoder();
                let bytesPerRow=texture.size[0] * bytes_per_fixel;
                const missAlignment=bytesPerRow % 256;
                if(missAlignment !== 0) {
                    bytesPerRow=bytesPerRow-missAlignment + 256;
                }
                const buffer = texture.gpu.device.createBuffer({
                    size: bytesPerRow * texture.size[1],
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                });
                encoder.copyTextureToBuffer(
                    {
                        texture: texture.texture,
                        origin:[0,0,depth]
                    },
                    {
                        buffer: buffer,
                        bytesPerRow: bytesPerRow,
                        rowsPerImage: texture.size[1]
                    },
                    [texture.size[0], texture.size[1]]
                );
                texture.gpu.device.queue.submit([encoder.finish()]);
                buffer.mapAsync(GPUMapMode.READ).then(() => {
                    const c = document.createElement('canvas');
                    c.width = texture.size[0];
                    c.height = texture.size[1];

                    const ctx = c.getContext('2d');
                    if(!ctx) {
                        throw(new Error('Cannot get context'));
                    }
                    const imageData = ctx.createImageData(bytesPerRow/bytes_per_fixel, c.height);
                    let data:Uint8ClampedArray;
                    if(bytes_per_fixel > 4) {
                        const floatData=new Float32Array(buffer.getMappedRange());
                        data = new Uint8ClampedArray(texture.size[0] * texture.size[1] * 4);
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
                    texture.createTexture(1);
                }, 100)
            }, 100)
        }
}