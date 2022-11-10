import { Texture2D, type Texture2DParams } from "../Texture2D.js";
import { RenderTargetTextureUsage, TextureUsage } from "../Texture.js";

type ValueOf<T> = T[keyof T];
export type RenderTargetTextureUsageValue = ValueOf<typeof RenderTargetTextureUsage>

export class RenderTarget<
F extends GPUTextureFormat = GPUTextureFormat,
U extends RenderTargetTextureUsageValue = RenderTargetTextureUsageValue>
    extends Texture2D<F, U>
{
    #bytes_per_fixel: number;
    constructor(
        textureOptions: Texture2DParams<F, U>,
    ) {
        super(textureOptions);

        switch (textureOptions.format) {
            case 'r32uint':
            case 'bgra8unorm':
            case 'rgba8unorm':
            case 'depth32float':
                this.#bytes_per_fixel = 4;
                break;
            case 'rgba32float':
                this.#bytes_per_fixel = 16;
                break;
            default:
                throw new Error('unknown image format ' + textureOptions.format);
        }
    }
    copyFromExternalImage(
        source: GPUImageCopyExternalImage,
        destination: Omit<GPUImageCopyTextureTagged, 'texture'> & { origin?: GPUOrigin3DDict},
        copySize: GPUExtent3DDict,
        
    ) {
        if((this.usages & GPUTextureUsage.COPY_DST) === 0) {
            throw new Error('copyFromExternalImage: texture must include COPY_DST.')
        }
        if((destination.origin?.y ?? 0) + (copySize.height??0) > this.size.height) {
            throw new Error('copyFromExternalImage height touches outside of texture ')
        }
        if((destination.origin?.x ?? 0) + (copySize.width??0) > this.size.width) {
            throw new Error('copyFromExternalImage width touches outside of texture ')
        }
        this.gpu.device.queue.copyExternalImageToTexture(
            source, {
                ...destination,
                texture: this.texture
            },
            copySize
        )
    }
    async toBitmap(depth = 0) {
        //   const texture = this.resolveTexture ?? this;

        /*  if (this.renderPass.sampleCount > 1 && !this.resolveTexture) {
              throw (new Error('Printing MSAA swap target is not supported'))
          }*/

        //Use for debugging purpose.
        //this.#debug = true;
        let add_copy_src=false;
        if((this.usages & TextureUsage.COPY_SRC) === 0) {
            add_copy_src=true;
            this.createTexture(this.initialSampleCount, true);
            await new Promise(res => { requestAnimationFrame(res) });
            await new Promise(res => { requestAnimationFrame(res) });
        }
            
        const encoder = this.gpu.device.createCommandEncoder({ label: 'texture_toBitmap_encoder' });
        let bytesPerRow = this.size.width * this.#bytes_per_fixel;
        const missAlignment = bytesPerRow % 256;
        if (missAlignment !== 0) {
            bytesPerRow = bytesPerRow - missAlignment + 256;
        }
        const buffer = this.gpu.device.createBuffer({
            size: bytesPerRow * this.size.height,
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
                rowsPerImage: this.size.height
            },
            this.size
        );
        this.gpu.device.queue.submit([encoder.finish()]);
        await buffer.mapAsync(GPUMapMode.READ);

        let data: Uint8ClampedArray;
        if (this.#bytes_per_fixel > 4) {
            const floatData = new Float32Array(buffer.getMappedRange());
            data = new Uint8ClampedArray(this.size.width * this.size.height * 4);
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
        let bytesPerRow = this.size.width * this.#bytes_per_fixel;
        const missAlignment = bytesPerRow % 256;
        if (missAlignment !== 0) {
            bytesPerRow = bytesPerRow - missAlignment + 256;
        }

        const c = document.createElement('canvas');
        c.width = this.size.width;
        c.height = this.size.height;

        const ctx = c.getContext('2d');
        if (!ctx) {
            throw (new Error('Cannot get context'));
        }
        const imageData = ctx.createImageData(bytesPerRow / this.#bytes_per_fixel, c.height);
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

