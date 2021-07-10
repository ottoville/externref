import { RenderPass } from "./RenderPass.js";
import { GPU } from "../GPU.js";
import { GPUTextureUsage } from "../GPU.js";
export class Texture<F extends GPUTextureFormat> {
    texture: GPUTexture;
    view: GPUTextureView;
    renderPasses: Set<RenderPass> = new Set();
    createTexture(debug=false) {
        if (this.texture) {
            this.texture.destroy();
            this.renderPasses.forEach(rp => {
                rp.bundles.length = 0;
                rp.renderPipelines.forEach((rpVariant, pipeline) => rpVariant.renderpipeline = rp.decoratePipeline(pipeline))
            })
        }

        if (debug)
            this.usages.push(GPUTextureUsage.COPY_SRC);

        this.texture = this.gpu.device.createTexture({
            size:this.size, sampleCount:this.sampleCount, format:this.format,
            usage:this.usages.reduce((prev, curr) => prev | curr, 0),
        });
        this.view = this.texture.createView();
        return [this.view, this.texture] as const;
    }
    static create<F extends GPUTextureFormat>(gpu:GPU, format: F, usages: [typeof GPUTextureUsage.SAMPLED], sampleCount:number): GPUTextureSampled<F>
    static create<F extends GPUTextureFormat>(gpu:GPU, format: F, usages: [typeof GPUTextureUsage.RENDER_ATTACHMENT], sampleCount:number): GPUTextureRenderAttachment<F>
    static create<F extends GPUTextureFormat>(gpu:GPU, format: F, usages: [typeof GPUTextureUsage.SAMPLED | typeof GPUTextureUsage.RENDER_ATTACHMENT, typeof GPUTextureUsage.SAMPLED | typeof GPUTextureUsage.RENDER_ATTACHMENT], sampleCount:number): GPUTextureSampled<F> & GPUTextureRenderAttachment<F>
    static create<F extends GPUTextureFormat>(gpu:GPU, format: F, usages: [typeof GPUTextureUsage.SAMPLED | typeof GPUTextureUsage.RENDER_ATTACHMENT | typeof GPUTextureUsage.COPY_SRC, typeof GPUTextureUsage.SAMPLED | typeof GPUTextureUsage.RENDER_ATTACHMENT | typeof GPUTextureUsage.COPY_SRC, typeof GPUTextureUsage.SAMPLED | typeof GPUTextureUsage.RENDER_ATTACHMENT | typeof GPUTextureUsage.COPY_SRC], sampleCount:number): GPUTextureSampled<F> & GPUTextureRenderAttachment<F> & GPUTextureCopySrc<F>
    static create<F extends GPUTextureFormat>(gpu:GPU, format: F, usages: number[], sampleCount = 1): Texture<F> {
        return new Texture<F>(gpu, format,sampleCount,usages)
    }
    constructor(
        public gpu:GPU,
        public format: F,
        private sampleCount = 1,
        public usages: number[],
        public size: GPUExtent3DStrict = {width:300,height:300}) {
            [this.view, this.texture] = this.createTexture();
        }
        toBitmap() {
            const renderPass: RenderPass = this.renderPasses.values().next().value;
    
            //Use for debugging purpose.
            //this.#debug = true;
            const oldSampleCount = renderPass.sampleCount;
    
            renderPass.sampleCount = 1
            this.createTexture(true);
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
                    size: renderPass.size.height * renderPass.size.width * bytes_per_fixel,
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                })
                encoder.copyTextureToBuffer({
                    texture: this.texture
                }, { buffer: buffer, bytesPerRow: renderPass.size.width * bytes_per_fixel },
                    [renderPass.size.width, renderPass.size.height, 1]);
                    this.gpu.device.queue.submit([encoder.finish()]);
                buffer.mapAsync(GPUMapMode.READ).then(() => {
                    const c = new OffscreenCanvas(renderPass.size.width, renderPass.size.height);
                    const ctx = c.getContext('2d');
                    const imageData = ctx!.createImageData(c.width, c.height);
                    let data:Uint8ClampedArray;
                    if(bytes_per_fixel > 4) {
                        const floatData=new Float32Array(buffer.getMappedRange());
                        data = new Uint8ClampedArray(renderPass.size.width * renderPass.size.height * 4);
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
                    ctx!.putImageData(imageData, 0, 0);
                    c.convertToBlob({
                        type: "image/jpeg",
                        quality: 0.95
                    }).then(b => {
                        console.log(URL.createObjectURL(b));
                    }).finally(() => {
                        buffer.destroy();
                    })
                });
                setTimeout(() => {
                    //this.#debug = false;
                    renderPass.sampleCount = oldSampleCount;
                    this.createTexture();
                }, 100)
            }, 100)
        }
}
export interface GPUTextureSampled<F extends GPUTextureFormat> extends Texture<F> {
    sampled: 'true';
}
export interface GPUTextureRenderAttachment<F extends GPUTextureFormat> extends Texture<F> {
    RenderAttachment: 'true';
}
export interface GPUTextureCopySrc <F extends GPUTextureFormat> extends Texture<F> {
    CopySrc: 'true';
}