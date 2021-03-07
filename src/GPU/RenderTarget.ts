import type { RenderPass } from "./RenderPass";

export class RenderTarget {
    view: GPUTextureView;
    texture: GPUTexture;
    debug = false
    createTexture(size: { width: number, height: number }, sampleCount: number) {
        this.texture?.destroy();
        this.size = size;
        this.sampleCount = sampleCount;
        let usage = this.usage;
        if (this.debug)
            usage |= GPUTextureUsage.COPY_SRC;
        this.texture = this.renderPass.gpu.device.createTexture({
            size,
            sampleCount,
            format: this.format,
            usage: usage,
        });
        this.view = this.texture.createView();
        return [this.view, this.texture] as const;
    }
    constructor(public renderPass: RenderPass,
        public format: GPUTextureFormat, public size: { width: number, height: number }, public sampleCount: number,public usage: GPUTextureUsageFlags = GPUTextureUsage.RENDER_ATTACHMENT) {
        [this.view, this.texture] = this.createTexture(size, sampleCount)
    }
    toBitmap() {
        //Use for debugging purpose.
        this.debug = true;
        const oldSampleCount = this.renderPass.sampleCount;

        this.renderPass.sampleCount = 1
        this.renderPass.renderPipelines.forEach((rpVariant, rp) => rpVariant.renderpipeline = this.renderPass.decoratePipeline(rp.renderPipelineDescriptor))

        this.renderPass.bundles.length = 0;
        this.renderPass.onResize(this.renderPass.size.width, this.renderPass.size.height)

        setTimeout(() => {
            const encoder = this.renderPass.gpu.device.createCommandEncoder();
            const buffer = this.renderPass.gpu.device.createBuffer({
                size: this.size.height * this.size.width * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            })
            encoder.copyTextureToBuffer({
                texture: this.texture
            }, { buffer: buffer, bytesPerRow: this.size.width * 4 },
                [this.size.width, this.size.height, 1]);
            this.renderPass.gpu.device.queue.submit([encoder.finish()]);
            buffer.mapAsync(GPUMapMode.READ).then(() => {
                let c = new OffscreenCanvas(this.size.width, this.size.height);
                let ctx = c.getContext('2d');
                let imageData = ctx!.createImageData(c.width, c.height);
                const data = new Uint8ClampedArray(buffer.getMappedRange());
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
                this.debug = false;
                this.renderPass.bundles.length = 0;
                this.renderPass.sampleCount = oldSampleCount;
                this.renderPass.renderPipelines.forEach((rpVariant, rp) => rpVariant.renderpipeline = this.renderPass.decoratePipeline(rp.renderPipelineDescriptor))
                this.renderPass.onResize(this.renderPass.size.width, this.renderPass.size.height)

                this.createTexture(this.size, this.sampleCount);
            }, 200)
        }, 200)
    }
}