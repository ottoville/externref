import { type GPUTextureUsageLiterals, Texture } from "../Texture.js";
import { TextureView } from "../TextureView.js";
import type { RenderPass } from "../RenderPasses/RenderPass.js";
import type { Engine } from "../../engine.js";
declare const engine: Engine;

export class RenderTarget<F extends GPUTextureFormat = GPUTextureFormat, U extends GPUTextureUsageLiterals[] = GPUTextureUsageLiterals[]>
    extends Texture<F, U>
{
    view: TextureView; 
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
        super(renderPass.gpu,format,usages,'renderTarget2_'+label,size,initialSampleCount);
        this.view = new TextureView(this, textureViewDescriptor);
    }
    override destroy() {
        this.renderPass.bundles.forEach(bundle => bundle.destroy());
        super.destroy();
    }


    toBitmap(depth = 0) {
     //   const texture = this.resolveTexture ?? this;
        
      /*  if (this.renderPass.sampleCount > 1 && !this.resolveTexture) {
            throw (new Error('Printing MSAA swap target is not supported'))
        }*/

        //Use for debugging purpose.
        //this.#debug = true;

        this.createTexture(1, true);
        let bytes_per_fixel: number;
        switch (this.format) {
            case 'r32uint':
                bytes_per_fixel = 4;
                break;
            case 'bgra8unorm':
                bytes_per_fixel = 4;
                break;
            case 'rgba32float':
                bytes_per_fixel = 16;
                break;
            case 'depth32float':
                bytes_per_fixel = 4;
                break;
        }
        setTimeout(() => {
            const encoder = this.gpu.device.createCommandEncoder({ label: 'texture_toBitmap_encoder' });
            let bytesPerRow = this.size[0] * bytes_per_fixel;
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
            buffer.mapAsync(GPUMapMode.READ).then(() => {
                const c = document.createElement('canvas');
                c.width = this.size[0];
                c.height = this.size[1];

                const ctx = c.getContext('2d');
                if (!ctx) {
                    throw (new Error('Cannot get context'));
                }
                const imageData = ctx.createImageData(bytesPerRow / bytes_per_fixel, c.height);
                let data: Uint8ClampedArray;
                if (bytes_per_fixel > 4) {
                    const floatData = new Float32Array(buffer.getMappedRange());
                    data = new Uint8ClampedArray(this.size[0] * this.size[1] * 4);
                    for (let i = 0; i < data.length; i += 4) {
                        const index = i;
                        const length = Math.sqrt(floatData[index]! * floatData[index]! + floatData[index + 1]! * floatData[index + 1]! + floatData[index + 2]! * floatData[index + 2]!);
                        //const length=Math.max(floatData[index]!,floatData[index+1]!,floatData[index+2]!)
                        data[i] = (floatData[index]! / length) * 255;
                        data[i + 1] = (floatData[index + 1]! / length) * 255;
                        data[i + 2] = (floatData[index + 2]! / length) * 255;
                        data[i + 3] = 255;
                    }
                } else {
                    data = new Uint8ClampedArray(buffer.getMappedRange());
                }
                imageData.data.set(data);
                buffer.unmap();
                ctx.putImageData(imageData, 0, 0);
                c.toBlob(b => {
                    if (!b) {
                        throw new Error('Blob creation failed');
                    }
                    console.log(URL.createObjectURL(b));
                    buffer.destroy();
                }, "image/jpeg", 0.96);

            }).catch(engine.showError);
            setTimeout(() => {
                //this.#debug = false;
                this.createTexture(1);
            }, 100)
        }, 100)
    }
}

