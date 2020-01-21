import { paintGround } from "./paintGround.js";
import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";

export class paintTexture extends paintGround {
    private subTextureCache: subTexture | null = null;
    private height: number=0;
    private centerX: number;
    private centerZ: number;
    private m1 = new Matrix();
    private texture: BABYLON.InternalTexture
    private gl: WebGL2RenderingContext;
    onMainPointerUp(end_position: Vector2, height: number): void {
        this.height = height;
        this.subTextureCache = null
    }
    onMainPointerDown(startingPoint: Vector2): void {
        this.m1.setRow(0, new Vector4(1, 0, 0, this.centerX + startingPoint.x));
        this.m1.setRow(1, new Vector4(0, 1, 0, 0));
        this.m1.setRow(2, new Vector4(0, 0, 1, this.centerZ + startingPoint.y));
        this.m1.setRow(3, new Vector4(0, 0, 0, 1));

    }
    constructor(
        public canvas: HTMLElement,
        protected scene: BABYLON.Scene,
        protected camera: BABYLON.ArcRotateCamera,
        protected ground: Terrain,
        protected sea: BABYLON.Mesh,
        protected zonedt: BABYLON.Texture,
        private textureWidth: number,
        private textureHeight: number,
        uitab: UITAB,
    ) {
        super(canvas, scene, camera, ground, sea, uitab);
        this.centerX = textureWidth / 2;
        this.centerZ = textureHeight / 2;
        this.texture = <any>zonedt._texture;
        this.gl = <WebGL2RenderingContext><any>scene.getEngine()._gl;
    };
    public activate(callback: PTResultF, options: { forceSharedVertices?: boolean }) {
        super.activate(callback, options);
    }
    onAreaDraw(width: number): void {
        if (Number.isNaN(width) || Number.isNaN(this.height)) {
            throw ('onAreaDraw non numeric width or height');
        }
        if (this.ang360.rad < 0) {
            throw ('onAreaDraw negative angle not supported');
        }
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture._webGLTexture);
        if (this.subTextureCache != null) {
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
            this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, this.subTextureCache.x, this.subTextureCache.z, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.subTextureCache.imageData);
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        }
        paintTexture.drawSubImage(width, this.height, this.ang360.rad, this.m1, this.texture._webGLTexture, this.scene.getEngine(), this.subTextureCache)
    }
    static drawSubImage(width: number, height: number, rad: number, m1: Matrix, texture: WebGLTexture, engine: BABYLON.Engine, subTextureCache?: { x: number, z: number, imageData: ImageData } | null) {
        let gl: WebGL2RenderingContext = <any>engine._gl;
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
        let c = document.createElement('canvas');
        let minX = Math.min(...translated.map(t => t.x));
        let minZ = Math.min(...translated.map(t => t.z));
        let maxX = Math.max(...translated.map(t => t.x));
        let maxZ = Math.max(...translated.map(t => t.z));

        c.width = maxX - minX;
        c.height = maxZ - minZ;
        let pixels: Uint8Array = new Uint8Array(4 * c.width * c.height);

        (function (gl: WebGL2RenderingContext) {
            if (!this._dummyFramebuffer) {
                let dummy = gl.createFramebuffer();

                if (!dummy) {
                    throw new Error("Unable to create dummy framebuffer");
                }
                this._dummyFramebuffer = dummy;
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, this._dummyFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            gl.readPixels(minX, minZ, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._currentFramebuffer);

        }).bind(engine)(gl);

        let ctx: CanvasRenderingContext2D | null;
        if (ctx = c.getContext("2d")) {
            let imageData = ctx.createImageData(c.width, c.height);
            imageData.data.set(pixels);
            ctx.save();
            ctx.putImageData(imageData, 0, 0);
            ctx.translate(0, c.height);
            ctx.scale(1, -1);
            ctx.drawImage(c, 0, 0);
            if (typeof(subTextureCache)!=='undefined')
                subTextureCache = { x: minX, z: minZ, imageData: imageData };
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
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, minX, minZ, gl.RGBA, gl.UNSIGNED_BYTE, c);
    }
}