

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
    private pickinfo: BABYLON.PickingInfo;
    private mousemove = new LazyEval((evt: PointerEvent) => {
        this.scene.createPickingRayToRef(evt.clientX, evt.clientY, this.terrain.getWorldMatrix(), this.ray, this.camera);
        this.pickinfo = this.terrain.intersects(this.ray);
        if (this.pickinfo.pickedPoint) {
            this.helper.position.x = this.pickinfo.pickedPoint.x;
            this.helper.position.y = 0;
            this.helper.position.z = this.pickinfo.pickedPoint.z;
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
    private _facesOfVertices:any[];
    //private _groundVerticesPositions;
    //private _groundVerticesNormals;
    //private _groundIndices;
    private _groundPositions: BABYLON.Vector3[];
    private _groundFacesNormals;
    private _subdivisionsOfVertices;
    private _selectedVertices: { vertice:number, distance:number }[];
    private direction = 0;
    private _invertDirection= 1;
    private heightMax = 500;
    private heightMin = -500;
    private _prepareDataModelForElevation  () {
        if (this._facesOfVertices == null) {
            this._facesOfVertices = [];

            //this._groundVerticesNormals = this.terrain.getVerticesData(BABYLON.VertexBuffer.NormalKind);

            this._groundPositions = [];
            var index;
            for (index = 0; index < this.terrain.positions.length; index += 3) {
                this._groundPositions.push(new BABYLON.Vector3(...new Float32Array(this.terrain.positions.buffer, index << 2, 3)));
                //this._groundPositions.push(new BABYLON.Vector3(this.terrain.positions[index], this.terrain.positions[index + 1], this.terrain.positions[index + 2]));
            }

            this._groundFacesNormals = [];
            for (index = 0; index < this.terrain.getTotalIndices() / 3; index++) {
                this._computeFaceNormal(index);
            }

            this._getFacesOfVertices();
        }
    };
    private _getFacesOfVertices () {
        this._facesOfVertices = [];
        this._subdivisionsOfVertices = [];
        var index;

        for (index = 0; index < this._groundPositions.length; index++) {
            this._facesOfVertices[index] = [];
            this._subdivisionsOfVertices[index] = [];
        }

        for (index = 0; index < this.terrain.indices.length; index++) {
            this._facesOfVertices[this.terrain.indices[index]].push((index / 3) | 0);
        }

        for (var subIndex = 0; subIndex < this.terrain.subMeshes.length; subIndex++) {
            var subMesh = this.terrain.subMeshes[subIndex];
            for (index = subMesh.verticesStart; index < subMesh.verticesStart + subMesh.verticesCount; index++) {
                this._subdivisionsOfVertices[index].push(subMesh);
            }
        }
    };
    private _getFaceVerticesIndex(faceID: number) : Uint32Array {
        return new Uint32Array(this.terrain.indices.buffer, (faceID * 3) << 2, 3);
    };
    private _computeFaceNormal (face) {
        var faceInfo = this._getFaceVerticesIndex(face);

        var v1v2 = this._groundPositions[faceInfo[0]].subtract(this._groundPositions[faceInfo[1]]);
        var v3v2 = this._groundPositions[faceInfo[2]].subtract(this._groundPositions[faceInfo[1]]);

        this._groundFacesNormals[face] = BABYLON.Vector3.Normalize(BABYLON.Vector3.Cross(v1v2, v3v2));
    };
    private _isBoxSphereIntersected (box, sphereCenter, sphereRadius) {
        var vector = BABYLON.Vector3.Clamp(sphereCenter, box.minimumWorld, box.maximumWorld);
        var num = BABYLON.Vector3.DistanceSquared(sphereCenter, vector);
        return (num <= (sphereRadius * sphereRadius));
    };
    private _updateSubdivisions (vertexIndex : number) {
        for (var index = 0; index < this._subdivisionsOfVertices[vertexIndex].length; index++) {
            var sub = this._subdivisionsOfVertices[vertexIndex][index];
            let boundingBox = sub.getBoundingInfo().boundingBox;
            let boundingSphere = sub.getBoundingInfo().boundingSphere;

            if (this._groundPositions[vertexIndex].y < boundingBox.minimum.y) {
                boundingSphere.radius += Math.abs(this._groundPositions[vertexIndex].y - boundingBox.minimum.y);
                boundingBox.minimum.y = this._groundPositions[vertexIndex].y;
            } else if (this._groundPositions[vertexIndex].y > boundingBox.maximum.y) {
                boundingBox.maximum.y = this._groundPositions[vertexIndex].y;
            }
        }

        var boundingBox = this.terrain.getBoundingInfo().boundingBox;
        var boundingSphere = this.terrain.getBoundingInfo().boundingSphere;
        if (this._groundPositions[vertexIndex].y < boundingBox.minimum.y) {
            boundingSphere.radius += Math.abs(this._groundPositions[vertexIndex].y - boundingBox.minimum.y);
            boundingBox.minimum.y = this._groundPositions[vertexIndex].y;
        } else if (this._groundPositions[vertexIndex].y > boundingBox.maximum.y) {
            boundingBox.maximum.y = this._groundPositions[vertexIndex].y;
        }
    };
    private _reComputeNormals() {
        let gl: WebGL2RenderingContext = <WebGL2RenderingContext><any>this.gl;
        var faces: {
            faceID: number,
            indices: Uint32Array
        }[] = [];

        this._selectedVertices.forEach(sv => {
            var faceOfVertices = this._facesOfVertices[sv.vertice];
            for (let index = 0; index < faceOfVertices.length; index++) {
                faces.push({
                    faceID: faceOfVertices[index],
                    indices: new Uint32Array(this.terrain.indices.buffer, (faceOfVertices[index] * 3) << 2, 3)
                });
            }
        });

        faces.forEach(face => {
            var v1v2 = this._groundPositions[face.indices[0]].subtract(this._groundPositions[face.indices[1]]);
            var v3v2 = this._groundPositions[face.indices[2]].subtract(this._groundPositions[face.indices[1]]);

            this._groundFacesNormals[face.faceID] = BABYLON.Vector3.Normalize(BABYLON.Vector3.Cross(v1v2, v3v2));

            face.indices.forEach(vertexIndex => {
                var faces = this._facesOfVertices[vertexIndex];
                var normal = BABYLON.Vector3.Zero();
                for (var index = 0; index < faces.length; index++) {
                    normal = normal.add(this._groundFacesNormals[faces[index]]);
                }
                normal = BABYLON.Vector3.Normalize(normal.scale(1.0 / faces.length));
                this.terrain.normals.set([normal.x, normal.y, normal.z], vertexIndex * 3);
            });
        });
        let min = Math.min(...faces.map(f => Math.min(...f.indices))) * 3;
        let max = Math.max(...faces.map(f => Math.max(...f.indices))) * 3;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.terrain._geometry._vertexBuffers[BABYLON.VertexBuffer.NormalKind]._buffer.getBuffer().underlyingResource);
        gl.bufferSubData(gl.ARRAY_BUFFER, min << 2, this.terrain.normalsView, min << 2, (max << 2) - (min << 2))
    };
    private elevateFaces(pickInfo: BABYLON.PickingInfo, radius: number, height: number) {
        this._prepareDataModelForElevation();
        this._selectedVertices = [];

        // Impact zone
        var sphereCenter = pickInfo.pickedPoint;
        sphereCenter.y = 0;

        // Determine list of vertices
        for (var subIndex = 0; subIndex < this.terrain.subMeshes.length; subIndex++) {
            var subMesh = this.terrain.subMeshes[subIndex];

            if (!this._isBoxSphereIntersected(subMesh.getBoundingInfo().boundingBox, sphereCenter, radius)) {
                continue;
            }

            for (let index: number = subMesh.verticesStart; index < subMesh.verticesStart + subMesh.verticesCount; index++) {
                var position = this._groundPositions[index];
                sphereCenter.y = position.y;

                let distance = BABYLON.Vector3.Distance(position, sphereCenter);

                if (distance < radius) {
                    this._selectedVertices.push({
                        vertice: index,
                        distance: distance
                    });
                }
            }
        }

        // Elevate vertices
 
        this._selectedVertices.forEach(sv => {
            let position = this._groundPositions[sv.vertice];
            var fullHeight = height * this.direction * this._invertDirection;
            if (sv.distance < radius * 0.3) {
                position.y += fullHeight;
            } else {
                position.y += fullHeight * (1.0 - (sv.distance - radius * 0.3) / (radius * 0.7));
            }

            if (position.y > this.heightMax)
                position.y = this.heightMax;
            else if (position.y < this.heightMin)
                position.y = this.heightMin;

            this.terrain.positions[sv.vertice * 3 + 1] = position.y;

            this._updateSubdivisions(sv.vertice);
        });

        // Normals
        this._reComputeNormals();
        let gl: WebGL2RenderingContext = <WebGL2RenderingContext><any>this.gl;
        // Update vertex buffer
        // this.scene.getEngine().updateDynamicVertexBuffer(this.terrain._geometry._vertexBuffers[BABYLON.VertexBuffer.PositionKind]._buffer.getBuffer(), this.terrain.positions);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.terrain._geometry._vertexBuffers[BABYLON.VertexBuffer.PositionKind]._buffer.getBuffer().underlyingResource);

        let subvertices = this._selectedVertices.map(sv => sv.vertice);
        let min = Math.min(...subvertices)*3;
        let max = Math.max(...subvertices)*3;
        //let view = new DataView(this.terrain.positionsBuffer, min << 2, length<<2);
        //gl.bufferData(gl.ARRAY_BUFFER, this.terrain.positions, gl.DYNAMIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, min << 2, this.terrain.positionsView, min << 2, (max << 2) - (min << 2))

        
        //this.terrain._geometry.getVertexBuffer(BABYLON.VertexBuffer.NormalKind).update(this.terrain.normals);
        this.terrain.createHeights();


      //  this.terrain._geometry.updateVerticesData(BABYLON.VertexBuffer.PositionKind, this.terrain.positions);
      //  this.terrain._geometry.updateVerticesData(BABYLON.VertexBuffer.NormalKind, this.terrain.normals);

        //this.terrain.updateVerticesData(BABYLON.VertexBuffer.PositionKind, this.terrain.positions);
        //this.terrain.updateVerticesData(BABYLON.VertexBuffer.NormalKind, this.terrain.normals);
    };
    activated: boolean;    name: string;
    activate = (): void => {
        let engine = this.scene.getEngine();
        this.helper.visibility = 1;
        engine.getRenderingCanvas().addEventListener("pointermove", this.mouseListener);
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
            this._options.samplers.push('slopeArr', 'facet1Arr', 'facet2Arr');
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
    };
    private mouseinterval: number;
    pointerdownf = (evt: PointerEvent): void => {
        if (evt.button !== 0) {
            /*let avarages = {
                test1: [],
                test2: []
            };
            let timed;
            for (let i = 0; i < 20; i++) {
                timed = new Date().getTime();
                this.terrain.intersects(this.ray);
                avarages['test1'].push(new Date().getTime() - timed)
                timed = new Date().getTime();
                this.terrain.intersects2(this.ray);
                avarages['test2'].push(new Date().getTime() - timed)
            }
            console.log(avarages);
            for (let key in avarages) {
                avarages[key].shift(); avarages[key].shift(); avarages[key].shift();
                console.log(key, avarages[key].reduce((a, b) => a + b, 0) / 17)
            }*/
            return;
        }
        let canvas = this.scene.getEngine().getRenderingCanvas();
        canvas.addEventListener("pointerup", this.pointerupf);
        this.camera.detachControl(canvas);
        this.mouseinterval = setInterval(() => {
            console.log('elevating');
            this.elevateFaces(this.pickinfo, 50, 5);
        }, 100);
    }
    pointerupf = (evt: PointerEvent): void => {
        let canvas = this.scene.getEngine().getRenderingCanvas();
        canvas.removeEventListener("pointerup", this.pointerupf);
        this.camera.attachControl(canvas, true);
        clearInterval(this.mouseinterval);
    }
    deactivate = (): void => {
        this.scene.getEngine().getRenderingCanvas().removeEventListener("pointerdown", this.pointerdownf);
        this.helper.visibility = 0;
        this.scene.getEngine().getRenderingCanvas().removeEventListener("pointermove", this.mouseListener);
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
    mouseListener = (evt: PointerEvent): void => {
        this.mousemove.eval(15,evt);
    }
    raise = (): void => {
        console.log('raise')
        this.direction = 1;
        let canvas = this.scene.getEngine().getRenderingCanvas();
        canvas.removeEventListener("pointerdown", this.pointerdownf);
        canvas.addEventListener("pointerdown", this.pointerdownf);

    }
    lower = (): void => {
        console.log('lower')
        this.direction = -1;
        let canvas = this.scene.getEngine().getRenderingCanvas();
        canvas.removeEventListener("pointerdown", this.pointerdownf);
        canvas.addEventListener("pointerdown", this.pointerdownf);
    }
}