import type { RenderPass } from "./RenderPass";

export class RenderTarget<T extends GPUTexture> {
    view: TerraGPUTextureView<T>;
    #texture: GPUTextureSampled | GPUTexture;
    #debug = false;
    renderPasses:Set<RenderPass>=new Set();

    createTexture() {
        if(this.#texture) {
            this.#texture.destroy();
            this.renderPasses.forEach(rp => {
                rp.bundles.length = 0;
                rp.renderPipelines.forEach((rpVariant, pipeline) => rpVariant.renderpipeline = rp.decoratePipeline(pipeline))
            })
        }
        const usage: [number] = [this.usage];
        if (this.#debug)
            usage.push(GPUTextureUsage.COPY_SRC);
            this.#texture = this.renderPass.gpu.createGPUTexture(
            this.renderPass.size,
            this.format,
            usage,
            this.sampleCount
        );
        this.view = this.#texture.createView() as TerraGPUTextureView<T>;
        return [this.view, this.#texture] as const;
    }
    constructor(
        public renderPass: RenderPass,
        public format: GPUTextureFormat,
        public loadValue: GPULoadOp | GPUColor,
        public usage: GPUTextureUsageFlags = GPUTextureUsage.RENDER_ATTACHMENT,
        private sampleCount = 1) {

        [this.view, this.#texture] = this.createTexture();
        renderPass.colorFormats.push(format);
        renderPass.renderTargets.push(this);
        this.renderPasses.add(renderPass);

    }
    toBitmap() {
        //Use for debugging purpose.
        this.#debug = true;
        const oldSampleCount = this.renderPass.sampleCount;

        this.renderPass.sampleCount = 1
        this.createTexture();
        setTimeout(() => {
            const encoder = this.renderPass.gpu.device.createCommandEncoder();
            const buffer = this.renderPass.gpu.device.createBuffer({
                size: this.renderPass.size.height * this.renderPass.size.width * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            })
            encoder.copyTextureToBuffer({
                texture: this.#texture
            }, { buffer: buffer, bytesPerRow: this.renderPass.size.width * 4 },
                [this.renderPass.size.width, this.renderPass.size.height, 1]);
            this.renderPass.gpu.device.queue.submit([encoder.finish()]);
            buffer.mapAsync(GPUMapMode.READ).then(() => {
                let c = new OffscreenCanvas(this.renderPass.size.width, this.renderPass.size.height);
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
                this.#debug = false;
                this.renderPass.sampleCount = oldSampleCount;
                this.createTexture();
            }, 100)
        }, 100)
    }
}