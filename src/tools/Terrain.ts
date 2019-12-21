

interface ITextureStatic {
    new(gl: WebGLRenderingContext | WebGL2RenderingContext, target: GLenum, level: GLint, n: 'R8' | 'R8_SNORM' | 'RG8' | 'RG8_SNORM' | 'RGB8' | 'RGB8_SNORM' | 'RGB565' | 'RGBA4' | 'RGB5_A1' | 'RGBA8' | 'RGBA8_SNORM' | 'RGB10_A2' | 'SRGB8' | 'SRGB8_ALPHA8' | 'R16F' | 'RG16F' | 'RGB16F' | 'RGBA16F' | 'R11F_G11F_B10F' | 'RGB9_E5', width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, pixels: ArrayBufferView): ITextureFilterable;   
}
interface ITextureStatic {
    new(gl: WebGLRenderingContext | WebGL2RenderingContext, target: GLenum, level: GLint, n: 'RGB10_A2UI' | 'R32F' | 'RG32F' | 'RGB32F' | 'RGBA32F' | 'R8I' | 'R8UI' | 'R16I' | 'R16UI' | 'R32I, gl.R32UI' | 'RG8I' | 'RG8UI' | 'RG16I' | 'RG16UI' | 'RG32I' | 'RG32UI' | 'RGB8I' | '.RGB8UI' | 'RGB16I' | 'RGB16UI' | 'RGB32I' | 'RGB32UI' | 'RGBA8I' | 'RGBA8UI' | 'RGBA16I' | 'RGBA16UI' | 'RGBA32I' | 'RGBA32UI', width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, pixels: ArrayBufferView): ITextureNonFilterable;
}
interface ITextureFilterable {
    texParameterf(target: GLenum, pname: 'TEXTURE_MAG_FILTER' | 'TEXTURE_MIN_FILTER', param: 'LINEAR' | 'NEAREST'): void;
    texParameterf(target: GLenum, pname: 'TEXTURE_WRAP_S' | 'TEXTURE_WRAP_T', param: 'REPEAT' | 'CLAMP_TO_EDGE' | 'MIRRORED_REPEAT'): void;
    texParameterf(target: GLenum, pname: 'TEXTURE_COMPARE_FUNC', param: 'LEQUAL' | 'GEQUAL' | 'LESS' | 'GREATER' | 'EQUAL' | 'NOTEQUAL' | 'ALWAYS' | 'NEVER'): void;
    texParameterf(target: GLenum, pname: 'TEXTURE_COMPARE_MODE', param: 'NONE'| 'COMPARE_REF_TO_TEXTURE'): void;
    texParameterf(target: GLenum, pname: 'TEXTURE_WRAP_R', param: 'REPEAT' | 'CLAMP_TO_EDGE' | 'MIRRORED_REPEAT'): void;
    texParameterf(target: GLenum, pname: 'TEXTURE_BASE_LEVEL' | 'TEXTURE_MAX_LEVEL' | 'TEXTURE_MAX_LOD' | 'TEXTURE_MIN_LOD', param: number): void;

}
interface ITextureNonFilterable {
    texParameterf(target: GLenum, pname: 'TEXTURE_MAG_FILTER' | 'TEXTURE_MIN_FILTER', param: 'NEAREST'): void;
    texParameterf(target: GLenum, pname: 'TEXTURE_WRAP_S' | 'TEXTURE_WRAP_T', param: 'REPEAT' | 'CLAMP_TO_EDGE' | 'MIRRORED_REPEAT'): void;
    texParameterf(target: GLenum, pname: 'TEXTURE_COMPARE_FUNC', param: 'LEQUAL' | 'GEQUAL' | 'LESS' | 'GREATER' | 'EQUAL' | 'NOTEQUAL' | 'ALWAYS' | 'NEVER'): void;
    texParameterf(target: GLenum, pname: 'TEXTURE_COMPARE_MODE', param: 'NONE'| 'COMPARE_REF_TO_TEXTURE'): void;
    texParameterf(target: GLenum, pname: 'TEXTURE_WRAP_R', param: 'REPEAT' | 'CLAMP_TO_EDGE' | 'MIRRORED_REPEAT'): void;
    texParameterf(target: GLenum, pname: 'TEXTURE_BASE_LEVEL' | 'TEXTURE_MAX_LEVEL' | 'TEXTURE_MAX_LOD' | 'TEXTURE_MIN_LOD', param: number): void;

}
const texImage2D: ITextureStatic = class {
    constructor(public gl: WebGLRenderingContext | WebGL2RenderingContext, target: GLenum, level: GLint, internalformat: string, width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, pixels: ArrayBufferView) {
        gl.texImage2D(target, level, gl[internalformat], width, height, 0, format, type, pixels);
    }
    texParameterf(target: GLenum, pname: string, param: string | number) {
        this.gl.texParameteri(target, this.gl[pname], this.gl[param]);
    }
}

import { UITAB } from "../UITAB.js";
import { LazyEval } from "../LazyEval.js";
import { Terrain } from "../world/terrain.js";

export class TerrainTool extends UITAB {
    private ray = BABYLON.Ray.Zero();
    private mousemove = new LazyEval((evt: MouseEvent) => {
        this.scene.createPickingRayToRef(evt.clientX, evt.clientY, this.terrain.getWorldMatrix(), this.ray, this.camera);
        let point = this.terrain.intersects(this.ray);
        if (point.pickedPoint) {
            this.helper.position.x = point.pickedPoint.x;
            this.helper.position.y = 0;
            this.helper.position.z = point.pickedPoint.z;
        }
    });
    private vertexData = new BABYLON.VertexData();
    private helper = new BABYLON.Mesh("Helper");
    private helpermaterial: BABYLON.ShaderMaterial;
    private timed = new Date().getTime();
    private glTexture: WebGLTexture;
    private glTexture2: WebGLTexture;
    private glTexture3: WebGLTexture;
    private gl: WebGLRenderingContext;
    private setTime=() => {
        this.helpermaterial.setFloat("time", (this.timed - new Date().getTime()) / 1000);
    }
    constructor(
        private scene: BABYLON.Scene,
        private terrain: Terrain,
        private camera: BABYLON.ArcRotateCamera,
    ) {
        super();
        this.vertexData.positions = new Float32Array([
            -0.5, 0, -2,
            0.5, 0, -3,
            0.5, 0, 3,
            -0.5, 0, 2,
        ]);
        this.vertexData.indices = new Uint16Array([0, 1, 2, 3]);
        this.vertexData.applyToMesh(this.helper);
        this.helpermaterial = new BABYLON.ShaderMaterial("shader", this.scene, "./shaders/helper",
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"]
            });
        this.helpermaterial.fillMode = BABYLON.Material.TriangleFanDrawMode;
        this.gl = scene.getEngine()._gl;
        this.helper.alwaysSelectAsActiveMesh = true
    }
    activated: boolean;    name: string;
    activate = (): void => {
        let engine = this.scene.getEngine();
        this.helper.visibility = 1;
        engine.getRenderingCanvas().addEventListener("mousemove", this.mouseListener);
        this.scene.registerBeforeRender(this.setTime);

    /*******/
        let gl = this.gl;
        this.glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        let tex = new texImage2D(gl, gl.TEXTURE_2D, 0, 'RG16I', 250, 250, gl.RG_INTEGER, gl.SHORT, this.terrain.slopeArr);
        tex.texParameterf(gl.TEXTURE_2D, "TEXTURE_MAG_FILTER", "NEAREST");
        tex.texParameterf(gl.TEXTURE_2D, "TEXTURE_MIN_FILTER", "NEAREST");
        gl.bindTexture(gl.TEXTURE_2D, null);

    /********/
        this.glTexture2 = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture2);
       
        let tex2 = new texImage2D(gl, gl.TEXTURE_2D, 0, 'RGBA32F', 250, 250, gl.RGBA, gl.FLOAT, this.terrain.facet1Arr);
        tex2.texParameterf(gl.TEXTURE_2D, "TEXTURE_MAG_FILTER", "NEAREST");
        tex2.texParameterf(gl.TEXTURE_2D, "TEXTURE_MIN_FILTER", "NEAREST");
        gl.bindTexture(gl.TEXTURE_2D, null);

    /********/
        this.glTexture3 = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture3);

        let tex3 = new texImage2D(gl, gl.TEXTURE_2D, 0, 'RGBA32F', 250, 250, gl.RGBA, gl.FLOAT, this.terrain.facet2Arr);
        tex3.texParameterf(gl.TEXTURE_2D, "TEXTURE_MAG_FILTER", "NEAREST");
        tex3.texParameterf(gl.TEXTURE_2D, "TEXTURE_MIN_FILTER", "NEAREST");
        gl.bindTexture(gl.TEXTURE_2D, null);
        let me = this;
        (function () {
            this._options.samplers.push('slopeArr', 'facet1Arr','facet2Arr');
            this._textures = {
                slopeArr: {
                    getInternalTexture: () => ({ //https://github.com/BabylonJS/Babylon.js/blob/f287a1ea59027b97cb917850a5079c2e03d8fce4/src/Materials/Textures/internalTexture.ts
                        _source: 3,
                        _webGLTexture: me.glTexture
                    }),
                    isReady: () => true
                },
                facet1Arr: {
                    getInternalTexture: () => ({ 
                        _source: 3,
                        _webGLTexture: me.glTexture2
                    }),
                    isReady: () => true
                },
                facet2Arr: {
                    getInternalTexture: () => ({ 
                        _source: 3,
                        _webGLTexture: me.glTexture3
                    }), 
                    isReady: () => true
                }
            }
            return this;
        }).bind(this.helpermaterial)();
        
        this.helper.material = this.helpermaterial;
        this.helper._draw = (subMesh: BABYLON.SubMesh, fillMode: number, instancesCount?: number): BABYLON.Mesh => {
            engine.applyStates();
            engine._drawCalls.addCount(1, false);
            gl.drawElementsInstanced(gl.TRIANGLE_FAN, this.vertexData.indices.length, gl.UNSIGNED_SHORT, 0, 8);
            return this.helper;
        };
    }
    deactivate = (): void => {
        this.helper.visibility = 0;
        this.scene.getEngine().getRenderingCanvas().removeEventListener("mousemove", this.mouseListener);
        this.scene.unregisterBeforeRender(this.setTime);
        this.gl.deleteTexture(this.glTexture);
        this.gl.deleteTexture(this.glTexture2);
        this.gl.deleteTexture(this.glTexture3);
        (function () {
            this._options.samplers=[];
            this._textures = {}
            return this;
        }).bind(this.helpermaterial)();
    };
    mouseListener = (evt: MouseEvent): void => {
        this.mousemove.eval(25,evt);
    }
    raise = (): void => {

    }
    lower = (): void => {

    }
}