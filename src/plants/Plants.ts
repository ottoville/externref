import { LazyEval } from "../LazyEval.js";
//import { translate, rotateMatrix } from "../math.js";
import {WorkerThread, WorkerReturn} from "../WorkerThread.js";
import { Terrain } from "../world/terrain.js";
//import simplex from '../simplex.js'

import type { PTDresult } from "../types/interfaces/index.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";

import type { WorldScene } from "../world/scene.js";
import { GPUScene } from "../GPUScene.js";


/**
 * Sets up indices for single blade mesh.
 * @param id array of indices
 * @param vc1 vertex start offset for front side of blade
 * @param vc2 vertex start offset for back side of blade
 * @param i index offset
 */

export class Plants {
    public numBlades: number = 4000000;
    public opts = {
        radius: 86
    }
    private offset: SharedArrayBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 2 * this.numBlades);
    private worker = new WorkerThread('/webworkers/grass.js');
    private ready: Promise<any>;
    public fillArea(area: PTDresult) {
        var d = new Date().getTime();
        
       // let amount = ~~Math.abs(area.size.h * area.size.w) * 2 // >> 2 // one per 2*2 grid
        //let amount = ~~Math.abs(area.size.h * area.size.w) * 4 // very aggressive amount on CPU
        let amount = Math.abs(area.size.h * area.size.w) << 3
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
        scene: GPUScene,
        terrainP: Promise<[Terrain, Promise<GPUBuffer>]>,
    ) {


        const drawable = scene.lights.lightsBindGroup.addDrawable({
            sampleCount: scene.sampleCount,
            primitiveTopology: 'triangle-strip',
            rasterizationState: {
                cullMode: 'none',
            },
            depthStencilState: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus-stencil8",
            },
            colorStates: [{
                format: "bgra8unorm",
            }],
            vertexStage: {
                module: scene.shaderModules.get("grass.vert")!,
                entryPoint: "main",
            },
            fragmentStage: {
                module: scene.shaderModules.get("grass.frag")!,
                entryPoint: "main"
            },
            vertexState: {
                indexFormat: 'uint16',
                vertexBuffers:
                    [{
                        arrayStride: 4 * 4,
                        stepMode: "instance" as GPUInputStepMode,
                        attributes: [{ // position
                            shaderLocation: 0,
                            offset: 0,
                            format: "float4" as GPUVertexFormat
                        }
                        ]
                    },
                    {
                        arrayStride: 4 * 4,
                        stepMode: "instance" as GPUInputStepMode,
                        attributes: [
                            {  // shape
                                shaderLocation: 1,
                                offset: 0,
                                format: "float4" as GPUVertexFormat
                            }
                        ]
                    }]
            },
        }, 7, 0);
        const positionGPU = scene.createGPUBuffer(this.numBlades * 4 * 4, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST] );
        const shapeGPU = scene.createGPUBuffer(this.numBlades * 4 * 4, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST]);


        const positionGPUSwap = scene.device.createBuffer({ size: this.numBlades * 4 * 4, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE });
        const shapeGPUSwap = scene.createGPUBuffer(this.numBlades * 4 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE]);

        drawable.setVertexBuffer(0, positionGPU)
        drawable.setVertexBuffer(1, shapeGPU)


        let shapes = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 3 * this.numBlades);
        let noises = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this.numBlades);

        this.ready = this.worker.message(WorkerReturn.Promise, 'init', {
            positions: this.offset,
            shape: shapes,
            noises: noises
        });

      /*  this.mat = new ShaderMaterial("shader", scene, "./shaders/grass2",
            {
                attributes: ["position", "normal", "uv", "shape", "worldPos", "noise"],
                uniforms: ["viewProjection", "view", "projection", "time", "map", "windIntensity", "grassColor", "lightDir", "camDir", "fogColor", "grassFogFar", "fogNear", "fogFar", "lightPos", "BLADESEGS", "BLADEVERTS"]
            });
            */

       /* const Poaceae = new TerraMesh("Poaceae", positions, undefined, new Float32Array(normals));
        Poaceae.alwaysSelectAsActiveMesh = true;
        Poaceae.material = new StandardMaterial("Poaceae", scene);
        Poaceae.material.isReadyForSubMesh = () => true;
        //@ts-ignore
        Poaceae.subMeshes[0]._materialEffect = {};

        Poaceae.material.bindForSubMesh = (world: Matrix, mesh: Mesh, subMesh: SubMesh): void => { };
        */

       /* let [VGPU, VARR] = this.device.createBufferMapped({ size: positions.length * 4, usage: GPUBufferUsage.VERTEX });
        new Float32Array(VARR).set(positions);
        VGPU.unmap()*/
        /*
        const renderPipeline = this.device.createRenderPipeline({
            //@ts-ignore
            sampleCount: engine._mainPassSampleCount,
            primitiveTopology: 'triangle-strip',
            rasterizationState: {
                cullMode: 'none',
            },
            depthStencilState: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus-stencil8",
            },
            colorStates: [{
                format: "bgra8unorm",
            }],
            vertexStage: {
                module: GPUScene.instance.shaderModules.get("grass.vert")!,
                entryPoint: "main",
            },
            fragmentStage: {
                module: GPUScene.instance.shaderModules.get("grass.frag")!,
                entryPoint: "main"
            },
            vertexState: {
                indexFormat: 'uint16',
                vertexBuffers:
                    [{
                        arrayStride: 4 * 4,
                        stepMode: "instance" as GPUInputStepMode,
                        attributes: [{ // position
                            shaderLocation: 0,
                            offset: 0,
                            format: "float4" as GPUVertexFormat
                        }
                        ]
                    },
                    {
                        arrayStride: 4 * 4,
                        stepMode: "instance" as GPUInputStepMode,
                        attributes: [
                            {  // shape
                                shaderLocation: 1,
                                offset: 0,
                                format: "float4" as GPUVertexFormat
                            }
                        ]
                    }]
            },
        });
       
        const bindGroups = [
            this.device.createBindGroup({
                layout: renderPipeline.getBindGroupLayout(0),
                entries: [{
                    binding: 0,
                    resource: {
                        //@ts-ignore
                        buffer: scene._sceneUbo._buffer.underlyingResource
                    }
                }],
            }),
            device.createBindGroup({
                layout: renderPipeline.getBindGroupLayout(1),
                entries: [{
                    binding: 0,
                    resource: {
                        buffer: GPUScene.instance.timeBuffer
                    }
                }],
            })
        ];
        
        Poaceae._draw = (subMesh: SubMesh, fillMode: number, instancesCount?: number): Mesh => {
            if (!Poaceae._geometry || !Poaceae._geometry.getVertexBuffers() || (!Poaceae._unIndexed && !Poaceae._geometry.getIndexBuffer())) {

                return Poaceae;
            }
            //@ts-ignore
            if (Poaceae._internalMeshDataInfo._onBeforeDrawObservable) {
                //@ts-ignore
                Poaceae._internalMeshDataInfo._onBeforeDrawObservable.notifyObservers(Poaceae);
            }

            //@ts-ignore
            engine._currentIndexBuffer = null;
            //@ts-ignore
            const renderPass = engine._bundleEncoder || engine._currentRenderPass!;

            renderPass.setPipeline(renderPipeline);
            renderPass.setVertexBuffer(0, positionGPU);
            renderPass.setVertexBuffer(1, shapeGPU);
          //  renderPass.setVertexBuffer(2, VGPU);
            //@ts-ignore
            engine._setRenderBindGroups(bindGroups);
            if (engine._alphaState.alphaBlend && engine._alphaState._isBlendConstantsDirty) {
                // TODO WebGPU. should use renderPass.
                //@ts-ignore
                engine._currentRenderPass!.setBlendColor(engine._alphaState._blendConstants as any);
            }
            renderPass.draw(7, this.bladesVisible, 0, 0);
            return Poaceae;
        }

 */
        

        terrainP.then((arr) => {
            const terrain = arr[0];
            
            const computePipeline = scene.device.createComputePipeline({
                computeStage: {
                    module: scene.shaderModules.get("getHeightAtCoordinates.comp")!,
                    entryPoint: "main"
                }
            });
            const layout = computePipeline.getBindGroupLayout(0) as BindGroupLayoutFiveBinding<[GPUBindGroupLayoutEntryReadStorage, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>;



 
            this.worker.subscribe('updated', async (data: { count: number }) => {
               /* await worldSetGPU.mapAsync(GPUMapMode.WRITE);
                const worldSetArr = worldSetGPU.getMappedRange();
                new Float32Array(worldSetArr).set(new Float32Array(this.offset));
                worldSetGPU.unmap();*/

                const commandEncoder = scene.device.createCommandEncoder();
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(computePipeline);


                const worldCopyGPU = scene.createGPUBuffer(this.numBlades * 2 * 4, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST], true);
                const worldSetArr = worldCopyGPU.getMappedRange();
                new Float32Array(worldSetArr).set(new Float32Array(this.offset));
                worldCopyGPU.unmap();
                const bindGroup = scene.createBindGroup(layout, {
                    binding: 0,
                    resource: {
                        buffer: worldCopyGPU
                    }
                },
                    {
                        binding: 1,
                        resource: {
                            buffer: terrain.slopeArrGPUBuffer
                        }
                    },
                    {
                        binding: 2,
                        resource: {
                            buffer: terrain.facet12ArrGPUBuffer
                        }
                    },
                    {
                        binding: 4,
                        resource: {
                            buffer: positionGPUSwap
                        }
                    },
                    {
                        binding: 5,
                        resource: {
                            buffer: shapeGPUSwap
                        }
                    });
                passEncoder.setBindGroup(0, bindGroup);
                passEncoder.dispatch(this.numBlades);
                passEncoder.endPass();
                commandEncoder.copyBufferToBuffer(
                    positionGPUSwap, 0,
                    positionGPU, 0,
                    this.numBlades * 4 * 4);
                commandEncoder.copyBufferToBuffer(
                    shapeGPUSwap, 0,
                    shapeGPU, 0,
                    this.numBlades * 4 * 4);
                scene.device.defaultQueue.submit([commandEncoder.finish()]);
                drawable.instanceCount = data.count
                console.log('updated grass buffers', data.count);
                return;



                /* gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
                    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(this.offset));
                    gl.bindBuffer(gl.ARRAY_BUFFER, glsbuffer);
                    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(shapes));
                    gl.bindBuffer(gl.ARRAY_BUFFER, glnoisebuffer);
                    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(noises));
                    gl.bindBuffer(gl.ARRAY_BUFFER, null);*/
            });
        })


        return;

      /*  let l = new LazyEval(() => {
            this.worker.message(WorkerReturn.Promise, 'get', {
                offset: this.offset,
                shape: shapes
            })
        }, true);
        l.eval(4000);
        this.camera.onViewMatrixChangedObservable.add(() => {
            l.eval(4000);
        });

        return;
        */

        



        //continue from here;














        //Empty array to contain calculated values or normals added

     /*   this.mat.setTexture("map", new Texture("./images/grass2.jpg", scene));
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


        this.mat.backFaceCulling = false;*/
 
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

        };


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
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(this.offset));
            gl.bindBuffer(gl.ARRAY_BUFFER, glsbuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(shapes));
            gl.bindBuffer(gl.ARRAY_BUFFER, glnoisebuffer);
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
        }); */
    }
}