import { paintGround } from "./paintGround.js";
import { updateSubTexture } from "../triginometry.js";

export class paintTexture extends paintGround {

    private subTextureCache: subTexture | null;
    private startingPoint: Vector3;
    private updateSubTextureLocal: any;
    private height: number;
    private centerX: number;
    private centerZ: number;
    private m1 = new Matrix();
    private texture: BABYLON.InternalTexture
    private gl: WebGL2RenderingContext;
    onMainPointerUp(end_position: Vector3, height: number): void {
        this.height = height;
        this.subTextureCache = null
    }
    onMainPointerDown(startingPoint: Vector3): void {
        this.startingPoint = startingPoint;
        this.m1.setRow(0, new Vector4(1, 0, 0, this.centerX + this.startingPoint.x));
        this.m1.setRow(1, new Vector4(0, 1, 0, 0));
        this.m1.setRow(2, new Vector4(0, 0, 1, this.centerZ + this.startingPoint.z));
        this.m1.setRow(3, new Vector4(0, 0, 0, 1));

    }
    constructor(
        public canvas: HTMLElement,
        protected scene: BABYLON.Scene,
        protected camera: BABYLON.ArcRotateCamera,
        protected ground: BABYLON.GroundMesh,
        protected sea: BABYLON.Mesh,
        protected zonedt: BABYLON.Texture,
        private textureWidth: number,
        private textureHeight:number
    ) {
        super(canvas, scene, camera, ground, sea);
        this.centerX = textureWidth / 2;
        this.centerZ = textureHeight / 2;
        this.texture = <any>zonedt._texture;
        this.gl = <WebGL2RenderingContext><any>scene.getEngine()._gl;
    };
    public activate(callback: PTResultF, options: { forceSharedVertices?: boolean }) {
        super.activate(callback, options);
        this.updateSubTextureLocal = updateSubTexture.bind(this.scene.getEngine());
    }
    onAreaDraw(width: number): void {
        if (Number.isNaN(width) || Number.isNaN(this.height)) {
            throw ('onAreaDraw non numeric width or height');
        }
        if (this.ang360.rad < 0) {
            throw ('onAreaDraw negative angle not supported');
        }
        
        let h= width * -1
        let w =this.height * -1

        let coords: { x: number, z: number }[] = [
            { x: 0, z: 0 },
            { x: 0, z: h },
            { x: w, z: 0 },
            { x: w, z: h }
        ]
      //  console.log(this.ang360.deg);
        let my = rotateMatrix(this.ang360.rad, "y");
        let translated0 = coords.map(coord => {
            return translate(coord.x, 0, coord.z, my)
        })
        let translated = translated0.map(coord => {
            return translate(coord.x, 0, coord.z, this.m1)
        });

        let minX = Math.min(...translated.map(t => t.x));
        let minZ = Math.min(...translated.map(t => t.z));
        let maxX = Math.max(...translated.map(t => t.x));
        let maxZ = Math.max(...translated.map(t => t.z));
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture._webGLTexture);
        //this is null
        if (this.subTextureCache != null) {
            let c = document.createElement('canvas');
            c.width = this.subTextureCache.imageData.width;
            c.height = this.subTextureCache.imageData.height
            let ctx: CanvasRenderingContext2D | null;
            if (ctx = c.getContext("2d")) {
                ctx.putImageData(this.subTextureCache.imageData, 0, 0);
                ctx.translate(0, c.height);
                ctx.scale(1, -1);
                ctx.drawImage(c, 0, 0);
            } else {
                throw ('Cannot get 2d context');
            }
            this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, this.subTextureCache.x, this.subTextureCache.z, this.gl.RGBA, this.gl.UNSIGNED_BYTE, c);
        }
        let c = document.createElement('canvas');
        c.width = maxX - minX;
        c.height = maxZ - minZ;
        let pixels: Uint8Array = new Uint8Array(4 * c.width * c.height);
        let texture = this.texture;
        (function (gl) {
            if (!this._dummyFramebuffer) {
                let dummy = gl.createFramebuffer();

                if (!dummy) {
                    throw new Error("Unable to create dummy framebuffer");
                }
                this._dummyFramebuffer = dummy;
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, this._dummyFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture._webGLTexture, 0);

            gl.readPixels(minX, minZ, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this._currentFramebuffer);

        }).bind(this.scene.getEngine())(this.gl);

        let ctx: CanvasRenderingContext2D | null;
        if (ctx = c.getContext("2d")) {
            let imageData = ctx.createImageData(c.width, c.height);
            imageData.data.set(pixels);
            this.subTextureCache = { x: minX, z: minZ, imageData: imageData };

            ctx.save();

            ctx.putImageData(imageData, 0, 0);
            ctx.translate(0, c.height);
            ctx.scale(1, -1);
            ctx.drawImage(c, 0, 0);

            ctx.restore();
            ctx.beginPath();
            let absDimensions: { w: number; h: number } = { w: Math.abs(w), h: Math.abs(h) }
            ctx.translate(c.width / 2, c.height / 2);
            ctx.rotate(this.ang360.rad);
            ctx.translate(c.width / -2, c.height / -2);
            ctx.translate((c.width - absDimensions.w) / 2, (c.height - absDimensions.h) / 2);
            ctx.fillStyle = "red";
            ctx.rect(0, 0, absDimensions.w, absDimensions.h);

            ctx.fill();
        } else {
            throw ('cannot get 2D context');
        }

        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, minX, minZ, this.gl.RGBA, this.gl.UNSIGNED_BYTE, c);




        //this.subTextureCache = this.updateSubTextureLocal(this.zonedt, width * -1, this.height * -1, this.startingPoint, this.ang360, this.centerX, this.centerZ, this.subTextureCache);
    }
}