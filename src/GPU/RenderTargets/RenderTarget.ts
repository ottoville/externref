import { type GPUTextureUsageLiterals, Texture } from "../Texture.js";
import { TextureView } from "../TextureView.js";
import type { RenderPass } from "../RenderPasses/RenderPass.js";

export class RenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends GPUTextureUsageLiterals[] = GPUTextureUsageLiterals[]>
    extends Texture<F, U>
{
    view: TextureView;
    bytes_per_fixel: number;
    constructor(
        format: F,
        usages: U,
        label: string,
        public renderPass: RenderPass,
        size: [GPUIntegerCoordinate, GPUIntegerCoordinate, GPUIntegerCoordinate] = [300, 300, 1],
        textureViewDescriptor?: GPUTextureViewDescriptor,
        public writeMask: GPUColorWriteFlags = 0xF,
        protected context?: GPUCanvasContext,
        initialSampleCount: 1 | 4 = 1,
    ) {
        super(renderPass.gpu, format, usages, 'renderTarget2_' + label, size, initialSampleCount);
        switch (format) {
            case 'r32uint':
                this.bytes_per_fixel = 4;
                break;
            case 'bgra8unorm':
                this.bytes_per_fixel = 4;
                break;
            case 'rgba32float':
                this.bytes_per_fixel = 16;
                break;
            case 'depth32float':
                this.bytes_per_fixel = 4;
                break;
            default:
                throw new Error('unknown image format');
            break;
        }
        this.view = new TextureView(this, textureViewDescriptor);
    }
    override destroy() {
        this.renderPass.bundles.forEach(bundle => bundle.destroy());
        super.destroy();
    }


    async toBitmap(depth = 0) {
        //   const texture = this.resolveTexture ?? this;

        /*  if (this.renderPass.sampleCount > 1 && !this.resolveTexture) {
              throw (new Error('Printing MSAA swap target is not supported'))
          }*/

        //Use for debugging purpose.
        //this.#debug = true;
        let add_copy_src=false;
        if(!this.usages.includes('COPY_SRC')) {
            add_copy_src=true;
            this.createTexture(this.initialSampleCount, true);
            await new Promise(res => { requestAnimationFrame(res) });
            await new Promise(res => { requestAnimationFrame(res) });
        }
            
        const encoder = this.gpu.device.createCommandEncoder({ label: 'texture_toBitmap_encoder' });
        let bytesPerRow = this.size[0] * this.bytes_per_fixel;
        const missAlignment = bytesPerRow % 256;
        if (missAlignment !== 0) {
            bytesPerRow = bytesPerRow - missAlignment + 256;
        }
        const buffer = this.gpu.device.createBuffer({
            size: bytesPerRow * this.size[1],
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
        encoder.copyTextureToBuffer(
            {
                texture: this.texture,
                origin: [0, 0, depth]
            },
            {
                buffer: buffer,
                bytesPerRow: bytesPerRow,
                rowsPerImage: this.size[1]
            },
            [this.size[0], this.size[1]]
        );
        this.gpu.device.queue.submit([encoder.finish()]);
        await buffer.mapAsync(GPUMapMode.READ);

        let data: Uint8ClampedArray;
        if (this.bytes_per_fixel > 4) {
            const floatData = new Float32Array(buffer.getMappedRange());
            data = new Uint8ClampedArray(this.size[0] * this.size[1] * 4);
            for (let i = 0; i < data.length; i += 4) {
                const index = i;
                const length = Math.hypot(floatData[index]!, floatData[index + 1]!, floatData[index + 2]!);
                //const length=Math.max(floatData[index]!,floatData[index+1]!,floatData[index+2]!)
                data[i] = (floatData[index]! / length) * 255;
                data[i + 1] = (floatData[index + 1]! / length) * 255;
                data[i + 2] = (floatData[index + 2]! / length) * 255;
                data[i + 3] = 255;
            }
        } else {
            data = new Uint8ClampedArray(buffer.getMappedRange().slice(0));
        }
        buffer.unmap();
        buffer.destroy();
        if (add_copy_src) {
            this.createTexture(this.initialSampleCount);
        }
        return data;
    }
    async print_bitmap() {
        let bytesPerRow = this.size[0] * this.bytes_per_fixel;
        const missAlignment = bytesPerRow % 256;
        if (missAlignment !== 0) {
            bytesPerRow = bytesPerRow - missAlignment + 256;
        }

        const c = document.createElement('canvas');
        c.width = this.size[0];
        c.height = this.size[1];

        const ctx = c.getContext('2d');
        if (!ctx) {
            throw (new Error('Cannot get context'));
        }
        const imageData = ctx.createImageData(bytesPerRow / this.bytes_per_fixel, c.height);
        const data = await this.toBitmap();
        imageData.data.set(data);
        ctx.putImageData(imageData, 0, 0);
        c.toBlob(b => {
            if (!b) {
                throw new Error('Blob creation failed');
            }
            console.log(URL.createObjectURL(b));
        }, "image/jpeg", 0.96);

    }
}

