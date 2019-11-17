import { LazyEval } from "../LazyEval.js";
//import { translate, rotateMatrix } from "../math.js";
import {WorkerThread, WorkerReturn} from "../WorkerThread.js";
//import simplex from '../simplex.js'


const BLADE_SEGS = 2 // # of blade segments

/**
 * Sets up indices for single blade mesh.
 * @param id array of indices
 * @param vc1 vertex start offset for front side of blade
 * @param vc2 vertex start offset for back side of blade
 * @param i index offset
 */

export class Plants {
    private mat: BABYLON.ShaderMaterial;
    public numBlades: number = 4000000;
    public opts = {
        radius: 86
    }
    private offset: SharedArrayBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 4 * this.numBlades);
    private worker = new WorkerThread('/webworkers/grass.js');
    private ready: Promise<any>;
    private bladesVisible: number = 0;
    public fillArea(area: PTDresult) {
        var d = new Date().getTime();
        var rotmax = rotateMatrix(area.ang.rad, "y");
        let amount = Math.abs(area.size.h * area.size.w) >> 2 // one per 2*2 grid
        //let amount = 100000
        if (amount === 0)
            return;
        let offsets: SharedArrayBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 3 * amount);

        for (let i = 0; i < amount; ++i) {
            let blade = new Float32Array(offsets, i * Float32Array.BYTES_PER_ELEMENT *3, 3);
            let posX = (Math.random() * area.size.h * -1);
            let posZ = (Math.random() * area.size.w * -1);
            let translated = translate(posX, 0, posZ, rotmax);
            blade[0] = area.coord.x + translated.x // x
            blade[1] = area.coord.z + translated.z // z
            blade[2] = Math.PI * 2.0 * Math.random() // rot
        }
        /*
         * 
         * old: 0:x,    1:y,    2:z,    3:r
         * new: 0:x,    1:z,    2:r
         * 
         * 
         * 
         * */
        this.ready.then(() => { 
            console.log('sending grass to worker, took ', new Date().getTime() - d);
            this.worker.message(WorkerReturn.noReturn, 'save',
            {
                buffer: offsets
            })
        }
        )

    }
    constructor(
        private scene: BABYLON.Scene,
        private camera: BABYLON.ArcRotateCamera,
        private terrain: BABYLON.GroundMesh,
    ) {
        let shapes = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 4 * this.numBlades);
        let noises = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this.numBlades);
        console.log('send message to worker');
        this.ready = this.worker.message(WorkerReturn.Promise, 'init', {
            positions: this.offset,
            shape: shapes,
            noises:noises
        });
        this.mat = new BABYLON.ShaderMaterial("shader", scene, "./shaders/grass2",
            {
                attributes: ["position", "normal", "uv", "shape", "worldPos","noise"],
                uniforms: ["viewProjection", "view", "projection", "time", "map", "windIntensity", "grassColor", "lightDir", "camDir", "fogColor", "grassFogFar", "fogNear", "fogFar", "lightPos", "BLADESEGS", "BLADEVERTS"]
            });

        var Poaceae = new BABYLON.Mesh("custom", scene);

        //Vertices for babylonjs mesh
        let vertices=Float32Array.from([
            1,  0.5,  0,
            1,  0,  0,
            0,      0,  0,
            0,      0.5,  0,
            0.015625, 1,  0].map(v => v*1));
        let index=Uint16Array.from([0,1,2,3,4]);
        //Empty array to contain calculated values or normals added
        var normals = [];
        BABYLON.VertexData.ComputeNormals(vertices, index, normals);
        let vertexData = new BABYLON.VertexData()
        vertexData.positions = vertices;
        vertexData.indices = index;
        vertexData.normals = normals
        vertexData.uvs = vertices.map(v => 0);
        this.mat.setTexture("map", new BABYLON.Texture("./images/grass2.jpg", scene));
        this.mat.setColor3("grassColor", new BABYLON.Color3(0.45, 0.46, 0.19));
        this.mat.setColor3("fogColor", new BABYLON.Color3(0.74, 0.77, 0.91));
        let LIGHT_DIR = new BABYLON.Vector3(1, 0, 0)
        LIGHT_DIR = LIGHT_DIR.normalize();
        LIGHT_DIR.z *= 0.5
        LIGHT_DIR = LIGHT_DIR.normalize();
        this.mat.setVector3("lightPos", new BABYLON.Vector3(20, 4000, 2));
        this.mat.setVector3("lightDir", LIGHT_DIR);
        let timed = new Date();
        scene.registerBeforeRender(() => {
            this.mat.setFloat("time", (timed.getTime() - new Date().getTime()) / 1000);
            this.mat.setVector3("camDir", camera.position);
        });
        //FIX

        this.mat.setFloat("windIntensity", 1.5);
        //fix
        this.mat.setFloat("fogFar", 1200.0);
        this.mat.setFloat("fogNear", 1.0);
        this.mat.setFloat("BLADESEGS", BLADE_SEGS);
        this.mat.setFloat("BLADEVERTS", (BLADE_SEGS + 1) * 2);
        //depth*2 fix
        this.mat.setFloat("grassFogFar", 1600);
        //this.mat.backFaceCulling = false;
        vertexData.applyToMesh(Poaceae, true);
        Poaceae.material = this.mat;
        Poaceae.isVisible = false;
        let engine = scene.getEngine()

        let gl: WebGLRenderingContext = engine._gl
        this.mat.backFaceCulling = false;
        let me = this;
        Poaceae._draw = function (subMesh: BABYLON.SubMesh, fillMode: number, instancesCount?: number): BABYLON.Mesh {
            if (!this._geometry || !this._geometry.getVertexBuffers() || (!this._unIndexed && !this._geometry.getIndexBuffer())) {
                return this;
            }

            if (this._internalMeshDataInfo._onBeforeDrawObservable) {
                this._internalMeshDataInfo._onBeforeDrawObservable.notifyObservers(this);
            };
            // Apply states
            (function() {
                this._depthCullingState.apply = function (gl: WebGLRenderingContext) {
                    if (!this.isDirty) {
                        return;
                    }
                    // Cull
                    if (this._isCullDirty) {
                        if (this.cull) {
                            gl.enable(gl.CULL_FACE);
                        } else {
                            gl.disable(gl.CULL_FACE);
                        }

                        this._isCullDirty = false;
                    }

                    // Cull face
                    if (this._isCullFaceDirty) {
                        gl.cullFace(<number>this.cullFace);
                        this._isCullFaceDirty = false;
                    }

                    // Depth mask
                    if (this._isDepthMaskDirty) {
                        gl.depthMask(this.depthMask);
                        this._isDepthMaskDirty = false;
                    }

                    // Depth test
                    if (this._isDepthTestDirty) {
                        if (this.depthTest) {
                            gl.enable(gl.DEPTH_TEST);
                        } else {
                            gl.disable(gl.DEPTH_TEST);
                        }
                        this._isDepthTestDirty = false;
                    }

                    // Depth func
                    if (this._isDepthFuncDirty) {
                        gl.depthFunc(<number>this.depthFunc);
                        this._isDepthFuncDirty = false;
                    }

                    // zOffset
                    if (this._isZOffsetDirty) {
                        if (this.zOffset) {
                            gl.enable(gl.POLYGON_OFFSET_FILL);
                            gl.polygonOffset(this.zOffset, 0);
                        } else {
                            gl.disable(gl.POLYGON_OFFSET_FILL);
                        }

                        this._isZOffsetDirty = false;
                    }

                    // Front face
                    if (this._isFrontFaceDirty) {
                        gl.frontFace(<number>this.frontFace);
                        this._isFrontFaceDirty = false;
                    }
                }

                this._depthCullingState.apply(gl);
                this._stencilState.apply(gl);
                this._alphaState.apply(gl);
            }).bind(engine)();
            // engine.applyStates();
            engine._drawCalls.addCount(1, false);
            let wireframe = false;
            //gl.enable(gl.CULL_FACE);
            //gl.cullFace(gl.FRONT_AND_BACK);
            gl.drawElementsInstanced(wireframe ? gl.LINES : gl.TRIANGLE_FAN, index.length, gl.UNSIGNED_SHORT, 0, me.bladesVisible);
            return this;
        }
        let instances: BABYLON.InstancedMesh[] = [];
        for (let i = 0; i < 1; ++i) {
            let bi = new BABYLON.InstancedMesh("box" + i, Poaceae);
            bi.position = BABYLON.Vector3.Zero();
            bi.alwaysSelectAsActiveMesh = true;
            bi.freezeWorldMatrix();
            bi.doNotSyncBoundingInfo = true;
            instances.push(bi);
        }
        let offsetbufferPlain = new BABYLON.Buffer(engine, new Float32Array(this.offset), true, 4, false, true);
        Poaceae._geometry.setVerticesBuffer(new BABYLON.VertexBuffer(engine, offsetbufferPlain, "worldPos", true, true, 0, true, 0, 4, undefined, undefined, true));

        let shapebuffer = new BABYLON.Buffer(engine, new Float32Array(shapes), true, 4, false, true);
        Poaceae._geometry.setVerticesBuffer(new BABYLON.VertexBuffer(engine, shapebuffer, "shape", true, true, 0, true, 0, 4, undefined, undefined, true));

        let noisebuffer = new BABYLON.Buffer(engine, new Float32Array(noises), true, 1, false, true);
        Poaceae._geometry.setVerticesBuffer(new BABYLON.VertexBuffer(engine, noisebuffer, "noise", true, true, 0, true, 0, 1, undefined, undefined, true));


        this.worker.subscribe('updated', (data) => {
            this.bladesVisible = data.count;
            for (let i = 0; i < data.count; ++i) {
                let blade = new Float32Array(this.offset, i << 4, 4);
                blade[3] = this.terrain.getHeightAtCoordinates(blade[0], blade[1]) // y
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, offsetbufferPlain.getBuffer().underlyingResource);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(this.offset));
            gl.bindBuffer(gl.ARRAY_BUFFER, shapebuffer.getBuffer().underlyingResource);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(shapes));
            gl.bindBuffer(gl.ARRAY_BUFFER, noisebuffer.getBuffer().underlyingResource);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(noises));
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        });
        let l = new LazyEval(() => {
            this.worker.message(WorkerReturn.Promise, 'get', {
                offset: this.offset,
                shape: shapes
            })
        }, true);
        l.eval(4000);
        this.camera.onViewMatrixChangedObservable.add(() => {
            l.eval(4000);
        });
    }
}