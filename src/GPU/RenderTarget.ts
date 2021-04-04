import type { RenderPass } from "./RenderPass";
import type { GPU } from "../GPU.js";

export class RenderTarget<T extends GPUTexture> {
    view: TerraGPUTextureView<T>;
    texture: GPUTextureSampled | GPUTexture;
    #debug = false;
    renderPasses: Set<RenderPass<{}>> = new Set();
    writableRenderPass?:RenderPass<{}>;
    createTexture() {
        if (this.texture) {
            this.texture.destroy();
            this.renderPasses.forEach(rp => {
                rp.bundles.length = 0;
                rp.renderPipelines.forEach((rpVariant, pipeline) => rpVariant.renderpipeline = rp.decoratePipeline(pipeline))
            })
        }
        const usage: [number] = [this.usage];
        if (this.#debug)
            usage.push(GPUTextureUsage.COPY_SRC);
        const size=this.writableRenderPass?this.writableRenderPass.size:{width:300,height:300};
        this.texture = this.gpu.createGPUTexture(
            size,
            this.format,
            usage,
            this.sampleCount
        );
        this.view = this.texture.createView() as TerraGPUTextureView<T>;
        return [this.view, this.texture] as const;
    }
    constructor(
        private gpu:GPU,
        public format: GPUTextureFormat,
        public loadValue: GPULoadOp | GPUColor,
        public usage: GPUTextureUsageFlags = GPUTextureUsage.RENDER_ATTACHMENT,
        private sampleCount = 1) {

        [this.view, this.texture] = this.createTexture();

    }
    toBitmap() {
        const renderPass: RenderPass<{}> = this.renderPasses.values().next().value;

        //Use for debugging purpose.
        this.#debug = true;
        const oldSampleCount = renderPass.sampleCount;

        renderPass.sampleCount = 1
        this.createTexture();
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
                let c = new OffscreenCanvas(renderPass.size.width, renderPass.size.height);
                let ctx = c.getContext('2d');
                let imageData = ctx!.createImageData(c.width, c.height);
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
                this.#debug = false;
                renderPass.sampleCount = oldSampleCount;
                this.createTexture();
            }, 100)
        }, 100)
    }
}