import { WorkerThread, WorkerReturn } from "../WorkerThread.js";
import { Terrain } from "../world/terrain.js";
//import simplex from '../simplex.js'

import { PTDresult } from "../types/interfaces/index.js";

import type { Scene } from "../Scene.js";
import { PlantsRenderPipeline } from "../GPU/RenderPipeLines/Plants.js";
import { Buffer, GPUBufferUsage } from "../GPU/Buffer/Buffer.js";

import type { Engine } from "../engine.js";
import { DrawableIndirect } from "../GPU/Drawables/DrawableIndirect.js";
import { getHeightAtCoordinates } from "../GPU/Shaders/grass/getHeightAtCoordinates.comp.js";
declare const engine: Engine;

/**
 * Sets up indices for single blade mesh.
 * @param id array of indices
 * @param vc1 vertex start offset for front side of blade
 * @param vc2 vertex start offset for back side of blade
 * @param i index offset
 */
const numBlades = 65535;

export class Plants {
    public opts = {
        radius: 86
    }
    //private offset: SharedArrayBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 2 * this.numBlades);
    #worker = new WorkerThread('grass.js');
    #ready: Promise<void>;
    public fillArea(area: PTDresult) {
        //let amount = 100000

        this.#ready.then(() => {
            // console.log('sending grass to worker, took ', new Date().getTime() - d);
            this.#worker.message(WorkerReturn.noReturn, 'save',
                {
                    area: area,
                    angle: area.rad
                }, [])
        }).catch(err => engine.showError(err))
    }
    constructor(
        scene: Scene,
        terrainP: Promise<Terrain>,
    ) {
        const indirectBuffer = Buffer.create(scene.gpu, 4 * 4, [GPUBufferUsage.INDIRECT, GPUBufferUsage.COPY_DST], 'indirectBuffer');
        const positionGPU = Buffer.create(scene.gpu, numBlades * 4 * 4, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST], 'positionGPU');
        const shapeGPU = Buffer.create(scene.gpu, numBlades * 4 * 4, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST], 'shapeGPU');


        const positionGPUSwap = Buffer.create(scene.gpu, numBlades * 4 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE], 'positionGPUSwap');
        const shapeGPUSwap = Buffer.create(scene.gpu, numBlades * 4 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE], 'shapeGPUSwap');
        if (engine.gpu) {
            const renderPipeline = engine.gpu.createRenderPipeline(PlantsRenderPipeline, { topology: 'triangle-strip', cullMode: 'none', stripIndexFormat: 'uint16' });
            new DrawableIndirect({
                renderPipeline,
                label: 'Plants',
                buffer: indirectBuffer,
                vertexBuffers: [positionGPU, shapeGPU, new Float32Array([
                    0.02, 0.0,
                    -0.02, 0.0,
                    0.014, 0.29,
                    -0.014, 0.29,
                    0.007, 0.57,
                    -0.007, 0.57,
                    0.0, 1.0
                ])]
            })
        }

        const shapes = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 3 * numBlades);
        const noises = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * numBlades);
        //@ts-ignore
        window.downloadGrass = () => {
            caches.match(new Request('/grass')).then(async cachedgrass => {
                if (cachedgrass) {
                    console.log('grass', URL.createObjectURL(await cachedgrass.blob()));
                }
            }).catch((e) => {
                console.error(e)
            });
        }

        this.#ready = terrainP.then(async terrain => {
            await this.#worker.message(WorkerReturn.Promise, 'init', {
                //  positions: this.offset,
                shape: shapes,
                noises: noises,
            }, []);
            const getHeightAtCoordinatesShader = new getHeightAtCoordinates(terrain.settingsLayout);
            
            const computePipeline = await getHeightAtCoordinatesShader.createComputePipeline('main');
            
            const settingsBindGroup = getHeightAtCoordinatesShader.bindLayouts[0].createBindGroup('bindGroup0', bindGroup0 => [
                {
                    binding: 0,
                    resource: terrain.settingsGPU.getStorageBinding(bindGroup0)
                }
            ])
            const bindGroup = getHeightAtCoordinatesShader.bindLayouts[1].createBindGroup('bindGroup1', bindGroup1 => [
                {
                    binding: 0,
                    resource: terrain.slopeArrGPUBuffer.getStorageBinding(bindGroup1)
                },
                {
                    binding: 1,
                    resource: terrain.facet12ArrGPUBuffer.getStorageBinding(bindGroup1)
                },
                {
                    binding: 2,
                    resource: positionGPUSwap.getStorageBinding(bindGroup1)
                },
                {
                    binding: 3,
                    resource: shapeGPUSwap.getStorageBinding(bindGroup1)
                },
                ]);

            this.#worker.subscribe('updated', (data: { buffer: SharedArrayBuffer }) => {
                const commandEncoder = scene.gpu.device.createCommandEncoder({ label: 'plants_encoder' });
                const passEncoder = commandEncoder.beginComputePass({ label: 'plants_pass_encoder' });
                passEncoder.setPipeline(computePipeline);

                const worldCopyGPU = Buffer.create(scene.gpu, numBlades * 2 * 4, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST], 'worldCopyGPU', (buffer) => {
                    const worldSetArr = buffer.getMappedRange();
                    new Uint8Array(worldSetArr).set(new Uint8Array(data.buffer));
                });
                const bindGroup2 = getHeightAtCoordinatesShader.bindLayouts[2].createBindGroup('bindGroup2', bg => [{
                    binding: 0,
                    resource: worldCopyGPU.getStorageBinding(bg)
                }]);

                passEncoder.setBindGroup(0, settingsBindGroup.bindGroup);
                passEncoder.setBindGroup(1, bindGroup.bindGroup);
                passEncoder.setBindGroup(2, bindGroup2.bindGroup);
                passEncoder.dispatchWorkgroups(numBlades);
                passEncoder.end();

                positionGPUSwap.copyTo(commandEncoder, positionGPU, 0, 0, numBlades * 4 * 4);

                shapeGPUSwap.copyTo(commandEncoder, shapeGPU, 0, 0, numBlades * 4 * 4);

                indirectBuffer.updateBufferRaw(commandEncoder, new Uint32Array([7, (data.buffer.byteLength / 4) * 2]).buffer)
                scene.gpu.pendingCommandBuffers.add(commandEncoder.finish());
            });
        }).catch(err => engine.showError(err))


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

    }
}