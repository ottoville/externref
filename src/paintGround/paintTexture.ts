import { paintGround } from "./paintGround.js";
import type { Terrain } from "../world/terrain.js";
import type { subTexture, PTResultF } from "../types/interfaces/index.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { Texture } from "../lib/babylon/Materials/Textures/texture.js";
import type { Engine } from "../lib/babylon/Engines/engine.js";
import type { WorldScene } from "../world/scene.js";
import { canvasListener, hasCanvasListener } from "../traits/canvasListener.js";
import { TerraScene } from "../TerraScene.js";
import { Sea } from "../world/water.js";
import { UITAB } from "../UITAB.js";




export class paintTexture extends paintGround {
    ratio: number;
    onEnd() { }
    private subTextureCache: subTexture = { x: 0, z: 0, width: 0, height: 0, imageData: null };
    private height: number = 0;
    private centerX: number;
    private centerZ: number;
    private m1 = new Matrix();
    onMainPointerUp(end_position: Float32Array, height: number): void {
        this.height = height;
        this.subTextureCache = { x: 0, z: 0, width: 0, height: 0, imageData: null }
    }
    onMainPointerDown(startingPoint: Float32Array): void {
        this.m1.setRow(0, new Vector4(1, 0, 0, this.centerX + startingPoint[0] / this.ratio));
        this.m1.setRow(1, new Vector4(0, 1, 0, 0));
        this.m1.setRow(2, new Vector4(0, 0, 1, this.centerZ + startingPoint[1] / this.ratio));
        this.m1.setRow(3, new Vector4(0, 0, 0, 1));
    }
    constructor(
        protected scene: TerraScene,
        protected camera: ArcRotateCamera,
        protected ground: Terrain,
        protected sea: Sea,
        protected zonedt: GPUTexture,
        private textureWidth: number,
        private textureHeight: number,
        uitab: hasCanvasListener,
    ) {
        super(TerraScene.instance, camera, ground, sea, uitab);
        this.centerX = textureWidth / 2;
        this.centerZ = textureHeight / 2;

        this.ratio = 10000 / textureWidth //texture coordinates
        //this.texture = zonedt._texture._webGLTexture;
    };
    public activate(callback: PTResultF, options: { forceSharedVertices?: boolean }) {
        super.activate(callback, options);
    }
    async onAreaDraw(width: number): Promise<void> {
        if (Number.isNaN(width) || Number.isNaN(this.height)) {
            throw ('onAreaDraw non numeric width or height');
        }
        if (this.ang360.rad < 0) {
            throw ('onAreaDraw negative angle not supported');
        }
        this.drawSubImage(width, this.height, this.ang360.rad, this.m1)
    }
    async drawSubImage(width: number, height: number, rad: number, m1: Matrix) {
        width /= this.ratio;
        height /= this.ratio;
        let h = width * -1
        let w = height * -1
        let coords: { x: number, z: number }[] = [
            { x: 0, z: 0 },
            { x: 0, z: h },
            { x: w, z: 0 },
            { x: w, z: h }
        ]
        let my = rotateMatrix(rad, "y");
        let translated0 = coords.map(coord => {
            return translate(coord.x, 0, coord.z, my)
        })
        let translated = translated0.map(coord => {
            return translate(coord.x, 0, coord.z, m1)
        });

        const minX = Math.min(...translated.map(t => t.x)) | 0;
        const minZ = Math.min(...translated.map(t => t.z)) | 0;
        const maxX = Math.max(...translated.map(t => t.x)) | 0;
        const maxZ = Math.max(...translated.map(t => t.z)) | 0;

        //c.width = maxX - minX;
        //c.height = maxZ - minZ;
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

        //const width = maxX - minX
        ctx.translate(0, c.height);

        ctx.restore();
        ctx.beginPath();
        let absDimensions: { w: number; h: number } = { w: Math.abs(w), h: Math.abs(h) }
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