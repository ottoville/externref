import { paintGround } from './paintGround.js';
import type { Terrain } from '../world/Terrain.js';
import type { subTexture, PTResultF } from '../types/interfaces/index.js';
import type { Scene } from '../Scene.js';
import { TerraVector2 } from '../Math.js';
import type { Texture } from '../GPU/Texture.js';
import type { Texture2dSize } from '../GPU/RenderTargets/RenderPassTarget.js';

export class paintTexture extends paintGround {
    private subTextureCache: subTexture = {
        height: 0, imageData: null, width: 0, x: 0, z: 0,
    };
    private height = 0;
    onMainPointerUp(height: number): void {
        this.height = height;
        this.subTextureCache = {
            height: 0, imageData: null, width: 0, x: 0, z: 0,
        };
    }
    #offsetX = 0;
    #offsetY = 0;
    onMainPointerDown(startingPoint: TerraVector2): void {
        this.#offsetX = this.textureWidth * 0.5 + startingPoint[0] / this.ratio;
        this.#offsetY = this.textureHeight * 0.5 + startingPoint[1] / this.ratio;
    }
    constructor(
        scene: Scene,
        ground: Terrain,
        protected readonly zonedt: Texture<'rgba8unorm', 23, Texture2dSize>,
        private textureWidth: number,
        private textureHeight: number,
        private ratio: number,
        callback: PTResultF
    ) {
        super(scene,
            ground,
            callback);
    }
    onAreaDraw(width: number) {
        if (Number.isNaN(width) || Number.isNaN(this.height)) {
            throw (new Error('onAreaDraw non numeric width or height'));
        }
        if (this.ang360.rad < 0) {
            throw (new Error('onAreaDraw negative angle not supported'));
        }
        this.drawSubImage(width,
            this.height,
            this.ang360.rad);
    }
    async drawSubImage(width: number, height: number, rad: number) {
        width /= this.ratio;
        height /= this.ratio;
        const coords: { x: number, y: number }[] = [
            {
                x: 0, y: 0,
            },
            {
                x: 0, y: -width,
            },
            {
                x: -height, y: 0,
            },
            {
                x: -height, y: -width,
            }
        ];
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const translated = coords.map<[x: number, y: number]>(coord => {
            return [
                coord.x * cos + coord.y * sin + this.#offsetX,
                coord.x * -sin + coord.y * cos + this.#offsetY
            ];
        });

        const minX = Math.min(...translated.map(t =>
            t[0])) | 0;
        const minZ = Math.min(...translated.map(t =>
            t[1])) | 0;
        const maxX = Math.max(...translated.map(t =>
            t[0])) | 0;
        const maxZ = Math.max(...translated.map(t =>
            t[1])) | 0;

        const cwidth = maxX - minX;
        const cheight = maxZ - minZ;
        if (cwidth === 0 || cheight === 0) {
            return;
        }
        const missAlignment = (cwidth * 4) % 256;
        const alignment = missAlignment ? 256 - missAlignment : 0;
        const c = new OffscreenCanvas(cwidth + alignment / 4,
            cheight);
        const buffersize = c.width * c.height * 4;

        const ctx = c.getContext('2d');
        if (!ctx)
            throw (new Error('cannot get 2D context'));
        let imageData = ctx.createImageData(c.width,
            c.height);

        const tempBuffer = this.scene.gpu.device.createBuffer({
            size: buffersize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
        const tempTexture = this.scene.gpu.device.createTexture({
            format: 'rgba8unorm',
            size: {
                height: c.height, width: c.width,
            },
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
        });
        const encoder = this.scene.gpu.device.createCommandEncoder({
            label: 'drawSubImage_encoder',
        });
        encoder.copyTextureToTexture(
            {
                origin: {
                    x: minX, y: minZ,
                },
                texture: this.zonedt.texture,
            },
            {
                texture: tempTexture,
            },
            [
                c.width,
                c.height,
                1
            ]);
        if (width && this.subTextureCache.imageData) {
            const leftX = Math.max(this.subTextureCache.x,
                minX);
            const rightX = Math.min(this.subTextureCache.x + this.subTextureCache.width,
                minX + c.width);
            const topY = Math.max(this.subTextureCache.z,
                minZ);
            const bottomY = Math.min(this.subTextureCache.z + this.subTextureCache.height,
                minZ + c.height);

            if (leftX < rightX && topY < bottomY) {
                const intersectionoffsetSourceX = leftX - this.subTextureCache.x;
                const intersectionoffsetSourceY = topY - this.subTextureCache.z;

                const intersectionoffsetDestinationX = leftX - minX;
                const intersectionoffsetDestinationY = topY - minZ;
                encoder.copyTextureToTexture(
                    {
                        origin: {
                            x: intersectionoffsetSourceX, y: intersectionoffsetSourceY,
                        },
                        texture: this.subTextureCache.imageData,
                    }, //origin: [subX, subZ, 1]
                    {
                        origin: {
                            x: intersectionoffsetDestinationX, y: intersectionoffsetDestinationY,
                        },
                        texture: tempTexture,
                    },
                    [
                        rightX - leftX,
                        bottomY - topY,
                        1
                    ]);
            } else {
                console.log('Rectangles do not overlap, or overlap has an area of zero (edge/corner overlap)');
            }
        }
        encoder.copyTextureToBuffer({
            texture: tempTexture,
        },
        {
            buffer: tempBuffer, bytesPerRow: (c.width * 4),
        },
        [
            c.width,
            c.height,
            1
        ]);

        this.scene.gpu.device.queue.submit([encoder.finish()]);
        const encoder2 = this.scene.gpu.device.createCommandEncoder({
            label: 'drawSubImage2_encoder',
        });
        const cacheImage = this.subTextureCache.imageData;
        if (cacheImage) {
            encoder2.copyTextureToTexture(
                {
                    texture: cacheImage,
                },
                {
                    origin: {
                        x: this.subTextureCache.x, y: this.subTextureCache.z,
                    },
                    texture: this.zonedt.texture,
                },
                [
                    this.subTextureCache.width,
                    this.subTextureCache.height,
                    1
                ]);
        }
        if (typeof (this.subTextureCache) !== 'undefined') {
            this.subTextureCache.x = minX;
            this.subTextureCache.z = minZ;
            this.subTextureCache.width = c.width;
            this.subTextureCache.height = c.height;
            this.subTextureCache.imageData = tempTexture;
        }
        await tempBuffer.mapAsync(GPUMapMode.READ);
        imageData.data.set(new Uint8ClampedArray(tempBuffer.getMappedRange()));
        tempBuffer.unmap();
        tempBuffer.destroy();
        ctx.save();
        ctx.putImageData(imageData,
            0,
            0);
        ctx.translate(0,
            c.height);

        ctx.restore();
        ctx.beginPath();
        const absDimensions: { w: number; h: number } = {
            h: Math.abs(width), w: Math.abs(height),
        };
        ctx.translate(cwidth / 2,
            c.height / 2);
        ctx.rotate(rad * -1);
        ctx.translate(cwidth / -2,
            c.height / -2);
        ctx.translate(((cwidth - absDimensions.w) / 2),
            (c.height - absDimensions.h) / 2);
        ctx.fillStyle = 'red';
        ctx.rect(0,
            0,
            absDimensions.w,
            absDimensions.h);

        ctx.fill();
        imageData = ctx.getImageData(0,
            0,
            c.width,
            c.height);
        const tempBuffer2 = this.scene.gpu.device.createBuffer({
            mappedAtCreation: true,
            size: buffersize,
            usage: GPUBufferUsage.COPY_SRC,
        });
        new Uint8ClampedArray(tempBuffer2.getMappedRange()).set(new Uint8ClampedArray(imageData.data.buffer));
        tempBuffer2.unmap();

        encoder2.copyBufferToTexture({
            buffer: tempBuffer2, bytesPerRow: c.width * 4,
        },
        {
            origin: {
                x: minX,
                y: minZ,
            },
            texture: this.zonedt.texture,
        },
        {
            height: c.height, width: c.width,
        });
        this.scene.gpu.device.queue.submit([encoder2.finish()]);
        if (cacheImage)
            cacheImage.destroy();
    }
}