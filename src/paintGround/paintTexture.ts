import { paintGround } from "./paintGround.js";
import type { Terrain } from "../world/terrain.js";
import type { subTexture, PTResultF } from "../types/interfaces/index.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import { hasCanvasListener } from "../traits/canvasListener.js";
import { Sea } from "../world/water.js";
import type { Scene } from "../Scene.js";

export class paintTexture extends paintGround {
    onEnd() { }
    private subTextureCache: subTexture = { x: 0, z: 0, width: 0, height: 0, imageData: null };
    private height: number = 0;
    private centerX: number;
    private centerZ: number;
    onMainPointerUp(end_position: Float32Array, height: number): void {
        this.height = height;
        this.subTextureCache = { x: 0, z: 0, width: 0, height: 0, imageData: null }
    }
    #offsetX: number = 0;
    #offsetY: number = 0;
    onMainPointerDown(startingPoint: Float32Array): void {
        this.#offsetX = this.centerX + startingPoint[0] / this.ratio;
        this.#offsetY = this.centerZ + startingPoint[1] / this.ratio;
    }
    constructor(
        protected scene: Scene,
        protected camera: ArcRotateCamera,
        protected ground: Terrain,
        protected sea: Sea,
        protected zonedt: GPUTexture,
        textureWidth: number,
        textureHeight: number,
        uitab: hasCanvasListener,
        private ratio:number
    ) {
        super(scene, camera, ground, sea, uitab);
        this.centerX = textureWidth / 2;
        this.centerZ = textureHeight / 2;

        
    };
    public activate(callback: PTResultF) {
        super.activate(callback);
    }
    async onAreaDraw(width: number): Promise<void> {
        if (Number.isNaN(width) || Number.isNaN(this.height)) {
            throw ('onAreaDraw non numeric width or height');
        }
        if (this.ang360.rad < 0) {
            throw ('onAreaDraw negative angle not supported');
        }
        this.drawSubImage(width, this.height, this.ang360.rad)
    }
    async drawSubImage(width: number, height: number, rad: number) {
        width /= this.ratio;
        height /= this.ratio;
        let coords: { x: number, y: number }[] = [
            { x: 0, y: 0 },
            { x: 0, y: -width },
            { x: -height, y: 0 },
            { x: -height, y: -width }
        ]
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const translated = coords.map<[x:number, y:number]>(coord => {
            return [coord.x * cos + coord.y * sin + this.#offsetX,
                coord.x * -sin + coord.y * cos + this.#offsetY];
        });

        const minX = Math.min(...translated.map(t => t[0])) | 0;
        const minZ = Math.min(...translated.map(t => t[1])) | 0;
        const maxX = Math.max(...translated.map(t => t[0])) | 0;
        const maxZ = Math.max(...translated.map(t => t[1])) | 0;

        const cwidth = maxX - minX;
        const missAlignment = (cwidth * 4) % 256;
        const alignment = missAlignment ? 256 - missAlignment : 0
        let c = new OffscreenCanvas(cwidth + alignment / 4, maxZ - minZ);
        const buffersize = c.width * c.height * 4

        let ctx = c.getContext("2d");
        if (!ctx)
            throw ('cannot get 2D context');

        let imageData = ctx.createImageData(c.width, c.height);

        const tempBuffer = this.scene.gpu.device.createBuffer({
            size: buffersize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        const tempTexture = this.scene.gpu.device.createTexture({
            size: { width: c.width, height: c.height, depth: 1 },
            format: "rgba8unorm",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
        });
        const encoder = this.scene.gpu.device.createCommandEncoder();

        encoder.copyTextureToTexture(
            { texture: this.zonedt, origin: { x: minX, y: minZ } },
            { texture: tempTexture },
            [c.width, c.height, 1]);
        if (width && this.subTextureCache.imageData) {
            const leftX = Math.max(this.subTextureCache.x, minX);
            const rightX = Math.min(this.subTextureCache.x + this.subTextureCache.width, minX + c.width);
            const topY = Math.max(this.subTextureCache.z, minZ);
            const bottomY = Math.min(this.subTextureCache.z + this.subTextureCache.height, minZ + c.height);

            if (leftX < rightX && topY < bottomY) {
                const intersectionoffsetSourceX = leftX - this.subTextureCache.x
                const intersectionoffsetSourceY = topY - this.subTextureCache.z;

                const intersectionoffsetDestinationX = leftX - minX
                const intersectionoffsetDestinationY = topY - minZ;
                encoder.copyTextureToTexture(
                    { texture: this.subTextureCache.imageData, origin: { x: intersectionoffsetSourceX, y: intersectionoffsetSourceY } }, //origin: [subX, subZ, 1] 
                    { texture: tempTexture, origin: { x: intersectionoffsetDestinationX, y: intersectionoffsetDestinationY } },
                    [rightX - leftX, bottomY - topY, 1]);
            } else {
                console.log('Rectangles do not overlap, or overlap has an area of zero (edge/corner overlap)')
            }
        }
        encoder.copyTextureToBuffer({ texture: tempTexture }, { buffer: tempBuffer, bytesPerRow: (c.width * 4) }, [c.width, c.height, 1]);

        this.scene.gpu.device.defaultQueue.submit([encoder.finish()]);
        const encoder2 = this.scene.gpu.device.createCommandEncoder();
        const cacheImage = this.subTextureCache.imageData;
        if (cacheImage) {
            encoder2.copyTextureToTexture(
                { texture: cacheImage },
                { texture: this.zonedt, origin: { x: this.subTextureCache.x, y: this.subTextureCache.z } },
                [this.subTextureCache.width, this.subTextureCache.height, 1]);
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
        ctx.putImageData(imageData, 0, 0);
        ctx.translate(0, c.height);

        ctx.restore();
        ctx.beginPath();
        const absDimensions: { w: number; h: number } = { w: Math.abs(height), h: Math.abs(width) }
        ctx.translate(cwidth / 2, c.height / 2);
        ctx.rotate(rad * -1);
        ctx.translate(cwidth / -2, c.height / -2);
        ctx.translate(((cwidth - absDimensions.w) / 2), (c.height - absDimensions.h) / 2);
        ctx.fillStyle = "red";
        ctx.rect(0, 0, absDimensions.w, absDimensions.h);

        ctx.fill();
        imageData = ctx.getImageData(0, 0, c.width, c.height);
        const tempBuffer2 = this.scene.gpu.device.createBuffer({
            size: buffersize,
            usage: GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Uint8ClampedArray(tempBuffer2.getMappedRange()).set(new Uint8ClampedArray(imageData.data.buffer));
        tempBuffer2.unmap();

        encoder2.copyBufferToTexture({ buffer: tempBuffer2, bytesPerRow: c.width * 4 }, {
            texture: this.zonedt,
            origin: {
                x: minX,
                y: minZ
            }
        }, { width: c.width, height: c.height, depth: 1 });
        this.scene.gpu.device.defaultQueue.submit([encoder2.finish()]);
        if (cacheImage)
            cacheImage.destroy();
    }
}