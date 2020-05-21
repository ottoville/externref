import { LazyEval } from "../LazyEval.js";
//import { translate, rotateMatrix } from "../math.js";
import {WorkerThread, WorkerReturn} from "../WorkerThread.js";
import type { Terrain } from "../world/terrain.js";
//import simplex from '../simplex.js'

import type { PTDresult } from "../types/interfaces/index.js";
import { ShaderMaterial } from "../lib/babylon/Materials/shaderMaterial.js";
import type { Scene } from "../lib/babylon/scene.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import { Mesh } from "../lib/babylon/Meshes/mesh.js";
import { Color3 } from "../lib/babylon/Maths/math.color.js";
import { Vector3 } from "../lib/babylon/Maths/math.vector.js";
import { VertexBuffer } from "../lib/babylon/Meshes/buffer.js";
import type { Geometry } from "../lib/babylon/Meshes/geometry.js";
import type { SubMesh } from "../lib/babylon/Meshes/subMesh.js";
import { VertexData } from "../lib/babylon/Meshes/mesh.vertexData.js";
import { Texture } from "../lib/babylon/Materials/Textures/texture.js";
import { Buffer } from "../lib/babylon/Meshes/buffer.js";
import { TerraMesh } from "../TerraMesh.js";
import { StandardMaterial, StandardMaterialDefines } from "../lib/babylon/Materials/standardMaterial.js";
import { TerraEffect } from "../TerraEffect.js";
import { IEffectCreationOptions } from "../lib/babylon/Materials/effect.js";
import { WebGPUEngine } from "../lib/babylon/index.js";

const BLADE_SEGS = 2 // # of blade segments

/**
 * Sets up indices for single blade mesh.
 * @param id array of indices
 * @param vc1 vertex start offset for front side of blade
 * @param vc2 vertex start offset for back side of blade
 * @param i index offset
 */

export class Plants {
    private mat: ShaderMaterial;
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
        
        let amount = Math.abs(area.size.h * area.size.w) >> 2 // one per 2*2 grid
        //let amount = 100000
        if (amount === 0)
            return;
        
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
                area: area,
                amount: amount,
                angle: area.rad
            })
        }
        )

    }
    constructor(
        private scene: Scene,
        private camera: ArcRotateCamera,
        private terrain: Terrain,
    ) {
        
        const engine = scene.getEngine() as WebGPUEngine;
        let shapes = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 4 * this.numBlades);
        let noises = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this.numBlades);

        this.ready = this.worker.message(WorkerReturn.Promise, 'init', {
            positions: this.offset,
            shape: shapes,
            noises:noises
        });
        
        this.mat = new ShaderMaterial("shader", scene, "./shaders/grass2",
            {
                attributes: ["position", "normal", "uv", "shape", "worldPos","noise"],
                uniforms: ["viewProjection", "view", "projection", "time", "map", "windIntensity", "grassColor", "lightDir", "camDir", "fogColor", "grassFogFar", "fogNear", "fogFar", "lightPos", "BLADESEGS", "BLADEVERTS"]
            });

        const positions = new Float32Array([
            0.5, -3, 0,
            -0.5, -3, 0,
            0.5, -1, 0,
            -0.5, -1, 0,
            0.5, 1, 0,
            -0.5, 1, 0,
            0, 3, 0,
        ]);
        
        var normals: number[] = [];
        VertexData.ComputeNormals(positions, [0, 1, 2, 3, 4, 5, 6], normals);

        const Poaceae = new TerraMesh("Poaceae", positions, undefined, new Float32Array(normals));
        
        Poaceae._originalBuilderSideOrientation = Mesh._GetDefaultSideOrientation(undefined);

        Poaceae.geometry.getVertexBuffer("position").create();
        
        Poaceae.material = new StandardMaterial("Poaceae", scene);
        Poaceae.subMeshes[0].materialDefines = new StandardMaterialDefines();
        

        let defines = Poaceae.subMeshes[0]._materialDefines as StandardMaterialDefines;
        defines.markAsProcessed();
        
        Poaceae.alwaysSelectAsActiveMesh = true;

        var uniformBuffers = ["Material", "Scene"];

        var join = defines.toString();
        return;
        let effect = new TerraEffect("plants", <IEffectCreationOptions>{
            preprocessed: true,
            attributes: [],
            uniformsNames: [],
            uniformBuffersNames: uniformBuffers,
            samplers: [],
            defines: join,
            fallbacks: null,
            onCompiled: (Poaceae.material as StandardMaterial).onCompiled,
            onError: (Poaceae.material as StandardMaterial).onError,
            indexParameters: { }

        }, engine, undefined, engine, undefined, undefined, undefined, undefined, undefined, undefined, [
            TerraEffect._loadShader2("grass2.vert"), TerraEffect._loadShader2("grass2.frag")
        ]);

        



        //continue from here;






















        //Empty array to contain calculated values or normals added

        this.mat.setTexture("map", new Texture("./images/grass2.jpg", scene));
        this.mat.setColor3("grassColor", new Color3(0.45, 0.46, 0.19));
        this.mat.setColor3("fogColor", new Color3(0.74, 0.77, 0.91));
        let LIGHT_DIR = new Vector3(1, 0, 0)
        LIGHT_DIR = LIGHT_DIR.normalize();
        LIGHT_DIR.z *= 0.5
        LIGHT_DIR = LIGHT_DIR.normalize();
        this.mat.setVector3("lightPos", new Vector3(20, 4000, 2));
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

        Poaceae.material = this.mat;
        Poaceae.alwaysSelectAsActiveMesh = true;


        this.mat.backFaceCulling = false;
        Poaceae._draw = function (subMesh: SubMesh, fillMode: number, instancesCount?: number): Mesh {
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
                         //   gl.enable(gl.CULL_FACE);
                        } else {
                          //  gl.disable(gl.CULL_FACE);
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
                      //  gl.depthMask(this.depthMask);
                        this._isDepthMaskDirty = false;
                    }

                    // Depth test
                    if (this._isDepthTestDirty) {
                        if (this.depthTest) {
                           // gl.enable(gl.DEPTH_TEST);
                        } else {
                          //  gl.disable(gl.DEPTH_TEST);
                        }
                        this._isDepthTestDirty = false;
                    }

                    // Depth func
                    if (this._isDepthFuncDirty) {
                       // gl.depthFunc(<number>this.depthFunc);
                        this._isDepthFuncDirty = false;
                    }

                    // zOffset
                    if (this._isZOffsetDirty) {
                        if (this.zOffset) {
                           // gl.enable(gl.POLYGON_OFFSET_FILL);
                          //  gl.polygonOffset(this.zOffset, 0);
                        } else {
                          //  gl.disable(gl.POLYGON_OFFSET_FILL);
                        }

                        this._isZOffsetDirty = false;
                    }

                    // Front face
                    if (this._isFrontFaceDirty) {
                       // gl.frontFace(<number>this.frontFace);
                        this._isFrontFaceDirty = false;
                    }
                }
               
            }).bind(engine)();
            // engine.applyStates();
            engine._drawCalls.addCount(1, false);
            let wireframe = false;

          //  gl.drawElementsInstanced(wireframe ? gl.LINES : gl.TRIANGLE_FAN, index.length, gl.UNSIGNED_SHORT, 0, me.bladesVisible);
            return this;
        }
       // let offsetbufferPlain = new BABYLON.Buffer(engine, new Float32Array(this.offset), true, 4, false, true);

       /* let vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.offset), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        //@ts-ignore
        Poaceae._geometry._vertexBuffers['worldPos'] = {
            type: VertexBuffer.FLOAT,
            byteStride: 0,
            byteOffset: 0,
            normalized: false,
            //@ts-ignore
            getBuffer: () => { return { underlyingResource: vbo } },
            getSize: () => 4,
            getIsInstanced:  () => true,
            getInstanceDivisor: () => 1

        };*/


        //Poaceae._geometry.setVerticesBuffer(new BABYLON.VertexBuffer(engine, offsetbufferPlain, "worldPos", true, true, 0, true, 0, 4, undefined, undefined, true));

        let shapebuffer = new Buffer(engine, new Float32Array(shapes), true, 4, false, true);
        let geometry: Geometry | null;
        let noisebuffer = new Buffer(engine, new Float32Array(noises), true, 1, false, true);
        if (geometry = Poaceae._geometry) {
            geometry.setVerticesBuffer(new VertexBuffer(engine, shapebuffer, "shape", true, true, 0, true, 0, 4, undefined, undefined, true));
            geometry.setVerticesBuffer(new VertexBuffer(engine, noisebuffer, "noise", true, true, 0, true, 0, 1, undefined, undefined, true));
        }
        let glsbuffer: WebGLBuffer = shapebuffer.getBuffer()!.underlyingResource;
        let glnoisebuffer: WebGLBuffer = noisebuffer.getBuffer()!.underlyingResource;

        this.worker.subscribe('updated', (data) => {
            this.bladesVisible = data.count;
            for (let i = 0; i < data.count; ++i) {
                let blade = new Float32Array(this.offset, i << 4, 4);
                blade[3] = this.terrain.getHeightAtCoordinates(blade[0], blade[1]) // y
            }
           /* gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(this.offset));
            gl.bindBuffer(gl.ARRAY_BUFFER, glsbuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(shapes));
            gl.bindBuffer(gl.ARRAY_BUFFER, glnoisebuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(noises));
            gl.bindBuffer(gl.ARRAY_BUFFER, null);*/
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