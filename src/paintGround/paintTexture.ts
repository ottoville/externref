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
    private subTextureCache: subTexture = { x: 0, z: 0, imageData: null };
    private height: number=0;
    private centerX: number;
    private centerZ: number;
    private m1 = new Matrix();
    onMainPointerUp(end_position: Float32Array, height: number): void {
        this.height = height;
        this.subTextureCache = { x: 0, z: 0, imageData: null }
    }
    onMainPointerDown(startingPoint: Float32Array): void {
        //console.log('painttexture mainpointerdown', startingPoint[0], startingPoint[1] );

        this.m1.setRow(0, new Vector4(1, 0, 0, this.centerX + startingPoint[0]/this.ratio));
        this.m1.setRow(1, new Vector4(0, 1, 0, 0));
        this.m1.setRow(2, new Vector4(0, 0, 1, this.centerZ + startingPoint[1]/this.ratio));
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

        if (this.subTextureCache.imageData != null) {
           // this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, this.subTextureCache.x, this.subTextureCache.z, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.subTextureCache.imageData);
        }

        this.drawSubImage(width, this.height, this.ang360.rad, this.m1, this.subTextureCache)
    }
    drawSubImage(width: number, height: number, rad: number, m1: Matrix, subTextureCache?: subTexture) {
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
        //let c = document.createElement('canvas');
        
        let minX = Math.min(...translated.map(t => t.x));
        let minZ = Math.min(...translated.map(t => t.z));
        let maxX = Math.max(...translated.map(t => t.x));
        let maxZ = Math.max(...translated.map(t => t.z));

        //c.width = maxX - minX;
        //c.height = maxZ - minZ;
        //let c = new OffscreenCanvas(maxX - minX, maxZ - minZ);
        let c = new OffscreenCanvas(maxX - minX, maxZ - minZ);
        let pixels: Uint8Array = new Uint8Array(4 * c.width * c.height);
        /*
        (function (gl: WebGL2RenderingContext) {
            //@ts-ignore
            if (!this._dummyFramebuffer) {
                let dummy = gl.createFramebuffer();

                if (!dummy) {
                    throw new Error("Unable to create dummy framebuffer");
                }
                //@ts-ignore
                this._dummyFramebuffer = dummy;
            }
            //@ts-ignore
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._dummyFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            gl.readPixels(minX, minZ, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            //@ts-ignore
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._currentFramebuffer);
            //@ts-ignore
        }).bind(engine)(gl);
        */
        let ctx: OffscreenCanvasRenderingContext2D | null;
        if (ctx = c.getContext("2d")) {
            let imageData = ctx.createImageData(c.width, c.height);
            imageData.data.set(pixels);
            ctx.save();
            ctx.putImageData(imageData, 0, 0);
            ctx.translate(0, c.height);
            ctx.scale(1, -1);
            ctx.drawImage(c, 0, 0);
            if (typeof (subTextureCache) !== 'undefined') {
                console.log('paint subTextureCache');
                //subTextureCache = { x: minX, z: minZ, imageData: imageData };
                subTextureCache.x = minX;
                subTextureCache.z = minZ;
                subTextureCache.imageData = imageData;
            }
            ctx.restore();
            ctx.beginPath();
            let absDimensions: { w: number; h: number } = { w: Math.abs(w), h: Math.abs(h) }
            ctx.translate(c.width / 2, c.height / 2);
            ctx.rotate(rad);
            ctx.translate(c.width / -2, c.height / -2);
            ctx.translate((c.width - absDimensions.w) / 2, (c.height - absDimensions.h) / 2);
            ctx.fillStyle = "red";
            ctx.rect(0, 0, absDimensions.w, absDimensions.h);

            ctx.fill();
        } else {
            throw ('cannot get 2D context');
        }
        var imageData = ctx.getImageData(0, 0, c.width, c.height);
        var buffer = imageData.data.buffer;  // ArrayBuffer

        const gpubuffer = this.scene.gpu.device.createBuffer({
            size: 5120 * 5120 * 4,
            usage: GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        console.log('minX', minX | 0, 'minZ', minZ | 0);
        //let offset = (minX | 0) * 4 * 5120 + (minZ | 0) * 4;
        let offset = (minZ | 0) * 4 * 5120;
        const padding = offset % 8
        offset -= padding;
        console.log('size', 5120 * 5120 * 4, 'offset', offset, 'size2', c.width * c.height * 4)

       // const range = gpubuffer.getMappedRange(offset, c.width * c.height * 4);
        const range = gpubuffer.getMappedRange(offset, c.height * 4 * 5120);
        //@ts-ignore;
        new Uint8ClampedArray(range, padding).fill(255);
        gpubuffer.unmap();

        const encoder=this.scene.gpu.device.createCommandEncoder()
        encoder.copyBufferToTexture({ buffer: gpubuffer, bytesPerRow: 5120 * 4 }, { texture: this.zonedt }, { width: 5120, height: 5120, depth: 1 });
        this.scene.gpu.device.defaultQueue.submit([encoder.finish()]);
        /* this.scene.gpu.device.defaultQueue.writeTexture({ texture: this.zonedt }, buffer, {
            offset: minX * 4 * 5120 + minZ*4,
            bytesPerRow: c.width*4,
        }, { width: c.width, height: c.height, depth:1 });*/
        //@ts-ignore
        //gl.texSubImage2D(gl.TEXTURE_2D, 0, minX, minZ, gl.RGBA, gl.UNSIGNED_BYTE, c);
    }
}