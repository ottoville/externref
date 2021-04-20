//import { translate, rotateMatrix } from "../math.js";
import { WorkerThread, WorkerReturn } from "../WorkerThread.js";
import { Terrain } from "../world/terrain.js";
//import simplex from '../simplex.js'

import type { PTDresult } from "../types/interfaces/index.js";

import type { Scene } from "../Scene.js";
import { Shader, VertexShader } from "../GPU/RenderPipeline.js";
import { GPUBufferUsage } from "../GPU.js"



/**
 * Sets up indices for single blade mesh.
 * @param id array of indices
 * @param vc1 vertex start offset for front side of blade
 * @param vc2 vertex start offset for back side of blade
 * @param i index offset
 */

export class Plants {
    public numBlades = 4000000;
    public opts = {
        radius: 86
    }
    //private offset: SharedArrayBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 2 * this.numBlades);
    private worker = new WorkerThread('/js/workers/webworkers/grass.js');
    private ready: Promise<void>;
    public fillArea(area: PTDresult) {
        //let amount = 100000

        this.ready.then(() => {
            // console.log('sending grass to worker, took ', new Date().getTime() - d);
            this.worker.message(WorkerReturn.noReturn, 'save',
                {
                    area: area,
                    angle: area.rad
                })
        })
    }
    constructor(
        scene: Scene,
        terrainP: Promise<Terrain>,
    ) {
        const planstPipeline = scene.gpu.rootCameralayout.addRenderPipeline(new VertexShader(scene.engine.gpu, 'grass/grass.vert.wgsl', 'main', [{
            arrayStride: 4 * 4,
            stepMode: "instance" as GPUInputStepMode,
            attributes: [{ // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x4"
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
                    format: "float32x4"
                }
            ]
        }]), new Shader(scene.engine.gpu, 'color.frag.wgsl'), {
            primitive: { topology: 'triangle-strip', cullMode: 'none', stripIndexFormat: 'uint16' }
        });
        const drawable = planstPipeline.addDrawableIndirect(scene, new Set([scene.gpu.renderPassScreen]), scene.gpu.createGPUBuffer(4 * 4, [GPUBufferUsage.INDIRECT, GPUBufferUsage.COPY_DST]))
        const positionGPU = scene.gpu.createGPUBuffer(this.numBlades * 4 * 4, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST]);
        const shapeGPU = scene.gpu.createGPUBuffer(this.numBlades * 4 * 4, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST]);


        const positionGPUSwap = scene.gpu.device.createBuffer({ size: this.numBlades * 4 * 4, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE });
        const shapeGPUSwap = scene.gpu.createGPUBuffer(this.numBlades * 4 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE]);

        drawable.setVertexBuffer(0, positionGPU)
        drawable.setVertexBuffer(1, shapeGPU);


        const shapes = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 3 * this.numBlades);
        const noises = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * this.numBlades);

        this.ready = this.worker.message(WorkerReturn.Promise, 'init', {
            //  positions: this.offset,
            shape: shapes,
            noises: noises,
        });
        terrainP.then(terrain => {

            const computePipeline = scene.gpu.createComputePipeline("grass/getHeightAtCoordinates.comp.wgsl");
            const layout = computePipeline.getBindGroupLayout(0);
            const bindGroup = scene.gpu.device.createBindGroup({
                layout, entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: terrain.slopeArrGPUBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: terrain.facet12ArrGPUBuffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: positionGPUSwap
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: shapeGPUSwap
                    }
                },
                {
                    binding: 4,
                    resource: {
                        buffer: terrain.settingsGPU
                    }
                }]
            });
            this.worker.subscribe('updated', async (data: { buffer: SharedArrayBuffer }) => {

                const commandEncoder = scene.gpu.device.createCommandEncoder();
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(computePipeline);

                const worldCopyGPU = scene.gpu.createGPUBuffer(this.numBlades * 2 * 4, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST], true);
                const bindGroup2 = scene.gpu.device.createBindGroup({
                    layout:computePipeline.getBindGroupLayout(1), entries: [{
                        binding: 0,
                        resource: {
                            buffer: worldCopyGPU
                        }
                    }]});
                const worldSetArr = worldCopyGPU.getMappedRange();
                new Uint8Array(worldSetArr).set(new Uint8Array(data.buffer));
                worldCopyGPU.unmap();

                passEncoder.setBindGroup(0, bindGroup);
                passEncoder.setBindGroup(1, bindGroup2);
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
                scene.gpu.updateBufferRaw(commandEncoder, drawable.buffer, new Uint32Array([7, (data.buffer.byteLength / 4) * 2]).buffer)
                scene.gpu.pendingCommandBuffers.push(commandEncoder.finish())
            });
        })


        return;


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

        /* 
 
 
 
         //Poaceae._geometry.setVerticesBuffer(new BABYLON.VertexBuffer(engine, offsetbufferPlain, "worldPos", true, true, 0, true, 0, 4, undefined, undefined, true));
 
         let shapebuffer = new Buffer(engine, new Float32Array(shapes), true, 4, false, true);
         let geometry: Geometry | null;
  
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