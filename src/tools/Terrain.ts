import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";
import { WorkerReturn } from "../WorkerThread.js";
import { texImage2D } from "../webgl.js";

//@ts-ignore
export class TerrainTool extends UITAB {
    
    private timer: number;
    //private ray = BABYLON.Ray.Zero();
    //private pickinfo: BABYLON.PickingInfo;
    //private vertexData = new BABYLON.VertexData();
    private helper = new BABYLON.Mesh("Helper");
    private helpermaterial: BABYLON.ShaderMaterial;
    private timed = new Date().getTime();
    private glTexture: WebGLTexture | null;
    private glTexture2: WebGLTexture | null;
    private glTexture3: WebGLTexture | null;
    private gl: WebGLRenderingContext;
    private uniformsV2: Map<WebGLUniformLocation, { x: number, y: number }> = new Map();
    private setTime=() => {
        this.helpermaterial.setFloat("time", (this.timed - new Date().getTime()) / 1000);
    }
    public canvas: HTMLCanvasElement;
    private helperIndices = new Uint16Array([0, 1, 2, 3]);
    constructor(
        private scene: BABYLON.Scene,
        private terrain: Terrain,
        private camera: BABYLON.ArcRotateCamera,
    ) {
        super();
        this.canvas = <any>scene.getEngine().getRenderingCanvas();
       /* this.vertexData.positions = new Float32Array([
            -0.5, 0, -2,
            0.5, 0, -3,
            0.5, 0, 3,
            -0.5, 0, 2,
        ]);
        this.vertexData.indices = new Uint16Array([0, 1, 2, 3]);
        this.vertexData.applyToMesh(this.helper);*/
        this.helper.setIndices(this.helperIndices);
        this.helper.setVerticesData(BABYLON.VertexBuffer.PositionKind, new Float32Array([
            -0.5, 0, -2,
            0.5, 0, -3,
            0.5, 0, 3,
            -0.5, 0, 2,
        ]));
        this.helpermaterial = new BABYLON.ShaderMaterial("shader", this.scene, "./shaders/helper",
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "flatPos"]
            });
        this.helpermaterial.fillMode = BABYLON.Material.TriangleFanDrawMode;
        this.gl = scene.getEngine()._gl;
        this.helper.alwaysSelectAsActiveMesh = true
    }
    private _facesOfVertices:any[];
    //private _groundVerticesPositions;
    //private _groundVerticesNormals;
    //private _groundIndices;
   // private _groundPositions: BABYLON.Vector3[];
    private _groundFacesNormals: BABYLON.Vector3[];
    private _subdivisionsOfVertices;
    private _selectedVertices: { vertice:number, distance:number }[];
    private direction = 0;
    private _invertDirection= 1;
    private heightMax = 500;
    private heightMin = -500;

    private _getFacesOfVertices () {
        this._facesOfVertices = [];
        this._subdivisionsOfVertices = [];
        var index;
        let length = this.terrain.positions.length / 3;
        for (index = 0; index < length; index++) {
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
    private _isBoxSphereIntersected (box, sphereCenter, sphereRadius) {
        var vector = BABYLON.Vector3.Clamp(sphereCenter, box.minimumWorld, box.maximumWorld);
        var num = BABYLON.Vector3.DistanceSquared(sphereCenter, vector);
        return (num <= (sphereRadius * sphereRadius));
    };
    private _updateSubdivisions(vertexIndex: number) {
        let ypos = this.terrain.positions[vertexIndex * 3 + 1];
        for (var index = 0; index < this._subdivisionsOfVertices[vertexIndex].length; index++) {
            var sub = this._subdivisionsOfVertices[vertexIndex][index];
            let boundingBox = sub.getBoundingInfo().boundingBox;
            let boundingSphere = sub.getBoundingInfo().boundingSphere;

            if (ypos < boundingBox.minimum.y) {
                boundingSphere.radius += Math.abs(ypos - boundingBox.minimum.y);
                boundingBox.minimum.y = ypos;
            } else if (ypos > boundingBox.maximum.y) {
                boundingBox.maximum.y = ypos;
            }
        }

        var boundingBox = this.terrain.getBoundingInfo().boundingBox;
        var boundingSphere = this.terrain.getBoundingInfo().boundingSphere;
        if (ypos < boundingBox.minimum.y) {
            boundingSphere.radius += Math.abs(ypos - boundingBox.minimum.y);
            boundingBox.minimum.y = ypos;
        } else if (ypos > boundingBox.maximum.y) {
            boundingBox.maximum.y = ypos;
        }
    };
    name: string;
    activate = (): void => {
        let engine = this.scene.getEngine();
        this.helper.visibility = 1;
        this.addListener("pointermove", this.mouseListener, {lazy: 15});
        this.scene.registerBeforeRender(this.setTime);

        /*******/
        let gl = this.gl;
        this.glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        let tex = new texImage2D(gl, gl.TEXTURE_2D, 0, 'R16I', 250, 250, gl.RED_INTEGER, gl.SHORT, this.terrain.slopeArr);
        tex.texParameterf(gl.TEXTURE_2D, "TEXTURE_MAG_FILTER", "NEAREST");
        tex.texParameterf(gl.TEXTURE_2D, "TEXTURE_MIN_FILTER", "NEAREST");

        /********/
        this.glTexture2 = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glTexture2);

        let tex2 = new texImage2D(gl, gl.TEXTURE_2D, 0, 'RGBA32F', 250, 250, gl.RGBA, gl.FLOAT, this.terrain.facet1Arr);
        tex2.texParameterf(gl.TEXTURE_2D, "TEXTURE_MAG_FILTER", "NEAREST");
        tex2.texParameterf(gl.TEXTURE_2D, "TEXTURE_MIN_FILTER", "NEAREST");

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
        this.terrain.worker.subscribe('SubHeights', (v) => {
            let width = v.data.endX - v.data.offsetX;
            gl.bindTexture(gl.TEXTURE_2D, this.glTexture2);
            (<WebGL2RenderingContext><any>gl).texSubImage2D(gl.TEXTURE_2D, 0, v.data.offsetX, v.data.offsetY, width, 1, gl.RGBA, gl.FLOAT, this.terrain.facet1Arr, v.data.srcOffset)
            
            gl.bindTexture(gl.TEXTURE_2D, this.glTexture3);
            (<WebGL2RenderingContext><any>gl).texSubImage2D(gl.TEXTURE_2D, 0, v.data.offsetX, v.data.offsetY, width, 1, gl.RGBA, gl.FLOAT, this.terrain.facet2Arr, v.data.srcOffset)
            gl.bindTexture(gl.TEXTURE_2D, null);
        });
        let boundingInfo = this.terrain.subMeshes[0].getBoundingInfo();
        this.terrain.worker.subscribe('bounding', (v) => {
            boundingInfo.boundingBox.minimum.y = v.data.boundingBox.minY
            boundingInfo.boundingBox.maximum.y = v.data.boundingBox.maxY
            boundingInfo.boundingSphere.radius = v.data.boundingSphereRadius
        });
        this.helper.material = this.helpermaterial;
        this.helpermaterial.bindOnlyWorldMatrix = (function (world: BABYLON.Matrix) {
            
            var scene = this.getScene();

            if (!this._effect) {
                return;
            }
            if (this._options.uniforms.indexOf("world") !== -1) {
                let effect = (<BABYLON.Effect>this._effect);
                //this._effect.setMatrix("world", world);
                if (effect._cacheMatrix("world", world)) {
                    //engine.setMatrices(effect.getUniform("world"), world.toArray() as Float32Array);
                    gl.uniformMatrix4fv(effect.getUniform("world"), false, world.toArray() as Float32Array);
                }
            }

            if (this._options.uniforms.indexOf("worldView") !== -1) {
                world.multiplyToRef(scene.getViewMatrix(), this._cachedWorldViewMatrix);
                this._effect.setMatrix("worldView", this._cachedWorldViewMatrix);
            }

            if (this._options.uniforms.indexOf("worldViewProjection") !== -1) {
                if (typeof(this._cachedWorldViewProjectionMatrix) == 'undefined')
                    this._cachedWorldViewProjectionMatrix = new BABYLON.Matrix();
                world.multiplyToRef(scene.getTransformMatrix(), this._cachedWorldViewProjectionMatrix);
                this._effect.setMatrix("worldViewProjection", this._cachedWorldViewProjectionMatrix);

            }
        }).bind(this.helpermaterial)

        

        this.helper._processRendering = (subMesh: BABYLON.SubMesh, effect: BABYLON.Effect, fillMode: number, batch: BABYLON._InstancesBatch, hardwareInstancedRendering: boolean,
            onBeforeDraw: (isInstance: boolean, world: BABYLON.Matrix, effectiveMaterial?: BABYLON.Material) => void, effectiveMaterial?: BABYLON.Material): BABYLON.Mesh => {

                    
            // Draw
            if (onBeforeDraw) {
                onBeforeDraw(false, this.helper._effectiveMesh.getWorldMatrix(), effectiveMaterial);
            }
            this.uniformsV2.forEach((value, uniform) => {
                gl.uniform2f(uniform, value.x, value.y);
            });
            this.uniformsV2.clear();

            // this._draw(subMesh, fillMode);
            engine.applyStates();
            engine._drawCalls.addCount(1, false);
            gl.drawElementsInstanced(gl.TRIANGLE_FAN, this.helperIndices.length, gl.UNSIGNED_SHORT, 0, 8);
           // gl.drawElementsInstanced(gl.TRIANGLE_FAN, this.vertexData.indices.length, gl.UNSIGNED_SHORT, 0, 8);
            return this.helper;

            //return this;

        }
     /*   this.helper._draw = (subMesh: BABYLON.SubMesh, fillMode: number, instancesCount?: number): BABYLON.Mesh => {
            engine.applyStates();
            engine._drawCalls.addCount(1, false);
            gl.drawElementsInstanced(gl.TRIANGLE_FAN, this.vertexData.indices.length, gl.UNSIGNED_SHORT, 0, 8);
            return this.helper;
        };*/
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
        this.addListener("pointerup", this.pointerupf, {once:true});
        this.camera.detachControl(this.canvas);
        this.mouseinterval = setInterval(() => {
            let gl = (<WebGL2RenderingContext><any>this.gl);
            //@ts-ignore
            let normalbuffer = this.terrain._geometry._vertexBuffers[BABYLON.VertexBuffer.NormalKind]._buffer.getBuffer().underlyingResource;
            //@ts-ignore
            let vertexbuffer: WebGLBuffer = this.terrain._geometry._vertexBuffers[BABYLON.VertexBuffer.PositionKind]._buffer.getBuffer().underlyingResource;
            this.timer = new Date().getTime();
            this.terrain.worker.message(WorkerReturn.Promise, 'elevateFaces', { radius: 50, height: 5, direction: this.direction }).then(e => {
                let NormalsRange = <{ normalsMin: number, normalsMax: number }><any>e;
                gl.bindBuffer(gl.ARRAY_BUFFER, normalbuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, NormalsRange.normalsMin, this.terrain.normalsView, NormalsRange.normalsMin, NormalsRange.normalsMax - NormalsRange.normalsMin)
                gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
                gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexbuffer);
                let range = <{ min: number, max: number }><any>e;
                gl.bufferSubData(this.gl.ARRAY_BUFFER, range.min, this.terrain.positionsView, range.min, range.max - range.min);
                gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
            });
            //this.elevateFaces(this.pickinfo, 50, 5);
        }, 100);
    }
    pointerupf = (evt: PointerEvent): void => {
        this.camera.attachControl(this.canvas, true);
        clearInterval(this.mouseinterval);
    }
    deactivate = (): void => {
        super.deactivate();
        this.terrain.worker.unsubscribe('heights');
        //this.removeListener("pointerdown", this.pointerdownf);
        this.helper.visibility = 0;
        //this.removeListener("pointermove", this.mouseListener);
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
        let engine = this.scene.getEngine();
        let viewport = this.camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        let boundingInfo = this.terrain.subMeshes[0].getBoundingInfo();
        this.terrain.worker.message(WorkerReturn.Promise, 'mousemove',
            {
                x: evt.clientX,
                y: evt.clientY,
                viewportWidth: viewport.width,
                viewportHeight: viewport.height,
                view: this.camera.getViewMatrix().toArray(),
                projection: this.camera.getProjectionMatrix().toArray()
            }).then(flatPos => {
                let uniformlocation;
                //@ts-ignore
                if (uniformlocation = this.helpermaterial._effect.getUniform("flatPos"))
                    this.uniformsV2.set(uniformlocation, <{ x: number, y: number }><any>flatPos);
            });
        //this.scene.createPickingRayToRef(evt.clientX, evt.clientY, this.terrain.getWorldMatrix(), this.ray, this.camera);
        // this.pickinfo = this.terrain.intersects(this.ray);
        //if (this.pickinfo.pickedPoint) {
        /*this.helper.position.x = this.pickinfo.pickedPoint.x;
        this.helper.position.y = 0;
        this.helper.position.z = this.pickinfo.pickedPoint.z;
        console.log(this.helper.position);*/
        //  this.uniformsV2.set(this.helpermaterial._effect.getUniform("flatPos"), { x: this.pickinfo.pickedPoint.x, y: this.pickinfo.pickedPoint.z})
        //[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -714.7799682617188, 0, -90.85552215576172, 1]
        // }
    }
    raise = (): void => {
        console.log('raise')
        this.direction = 1;
        //let canvas = this.scene.getEngine().getRenderingCanvas();
        this.removeListener("pointerdown", this.pointerdownf);
        this.addListener("pointerdown", this.pointerdownf);

    }
    lower = (): void => {
        console.log('lower')
        this.direction = -1;
        //let canvas = this.scene.getEngine().getRenderingCanvas();
        this.removeListener("pointerdown", this.pointerdownf);
        this.addListener("pointerdown", this.pointerdownf);
    }
}