import { WorkerThread, WorkerReturn } from "../WorkerThread.js";
import { Terrain } from "../world/Terrain.js";
//import simplex from '../simplex.js'

import { PTDresult } from "../types/interfaces/index.js";

import type { Scene } from "../Scene.js";
import { PlantsRenderPipeline } from "../GPU/RenderPipeLines/Plants.js";
import { Buffer, GPUBufferUsage } from "../GPU/Buffer/Buffer.js";

import type { Engine } from "../engine.js";
import { DrawableIndirect } from "../GPU/Drawables/DrawableIndirect.js";
import { GrassHeightAtCoordinates } from "../GPU/Shaders/grass/GrassHeightAtCoordinates.comp.js";
import { MainNode, new_rust_mesh } from "../MainNode.js";
declare const engine: Engine;

/**
 * Sets up indices for single blade mesh.
 * @param id array of indices
 * @param vc1 vertex start offset for front side of blade
 * @param vc2 vertex start offset for back side of blade
 * @param i index offset
 */
const numBlades = 65535;

export class Plants extends MainNode {
    drawable?: DrawableIndirect | undefined;
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
        super(new_rust_mesh({
            label: 'Plants'
        }));
        const indirectBuffer = Buffer.create(scene.gpu, 4 * 4, [GPUBufferUsage.INDIRECT, GPUBufferUsage.COPY_DST], 'indirectBuffer');
        const positionGPU = Buffer.create(scene.gpu, numBlades * 4 * 4, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST], 'positionGPU');
        const shapeGPU = Buffer.create(scene.gpu, numBlades * 4 * 4, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST], 'shapeGPU');


        const positionGPUSwap = Buffer.create(scene.gpu, numBlades * 4 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE], 'positionGPUSwap');
        const shapeGPUSwap = Buffer.create(scene.gpu, numBlades * 4 * 4, [GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE], 'shapeGPUSwap');
        if (engine.gpu) {
            const renderPipeline = engine.gpu.createRenderPipeline(PlantsRenderPipeline,
                {
                    topology: 'triangle-strip',
                    cullMode: 'none',
                    stripIndexFormat: 'uint16'
                },
                {
                    stride: 4
                }
            );
            this.drawable = new DrawableIndirect({
                renderPipeline,
                vertexBuffers: [
                    positionGPU, shapeGPU, new Float32Array([
                        0.02, 0.0,
                        -0.02, 0.0,
                        0.014, 0.29,
                        -0.014, 0.29,
                        0.007, 0.57,
                        -0.007, 0.57,
                        0.0, 1.0
                    ])
                ],
                node: this
            }, indirectBuffer);
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
            const getHeightAtCoordinatesShader = new GrassHeightAtCoordinates(Terrain.settings, scene.gpu);

            const computePipeline = await getHeightAtCoordinatesShader.createComputePipeline('main');

            this.#worker.subscribe('updated', (data: { buffer: SharedArrayBuffer }) => {
                const commandEncoder = scene.gpu.device.createCommandEncoder({ label: 'plants_encoder' });
                const passEncoder = commandEncoder.beginComputePass({ label: 'plants_pass_encoder' });
                passEncoder.setPipeline(computePipeline);

                const worldCopyGPU = Buffer.create(scene.gpu, numBlades * 2 * 4, [GPUBufferUsage.STORAGE, GPUBufferUsage.COPY_DST], 'worldCopyGPU', (buffer) => {
                    const worldSetArr = buffer.getMappedRange();
                    new Uint8Array(worldSetArr).set(new Uint8Array(data.buffer));
                });
                const bindGroup2 = getHeightAtCoordinatesShader.props.bindGroupLayouts[1].createBindGroup('bindGroup2', bg => [
                    {
                        binding: 0,
                        resource: worldCopyGPU.getStorageBinding(bg)
                    }
                ]);

                passEncoder.setBindGroup(0, bindGroup.bindGroup);
                passEncoder.setBindGroup(1, bindGroup2.bindGroup);
                passEncoder.dispatchWorkgroups(numBlades);
                passEncoder.end();

                positionGPUSwap.copyTo(commandEncoder, positionGPU, 0, 0, numBlades * 4 * 4);

                shapeGPUSwap.copyTo(commandEncoder, shapeGPU, 0, 0, numBlades * 4 * 4);
                indirectBuffer.updateBufferRaw(commandEncoder, new Uint32Array([7, (data.buffer.byteLength / 4) * 2]).buffer)
                scene.gpu.pendingCommandBuffers.push(commandEncoder.finish());
            });
            await this.#worker.message(WorkerReturn.Promise, 'init', {
                //  positions: this.offset,
                shape: shapes,
                noises: noises,
            }, []);

            const bindGroup = getHeightAtCoordinatesShader.props.bindGroupLayouts[0].createBindGroup('bindGroup1', bindGroup1 => [
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
        }).catch(err => engine.showError(err, scene.gpu));
    }
}