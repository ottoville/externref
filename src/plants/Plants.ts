import { WorkerThread, WorkerReturn } from '../WorkerThread.js';
import { Terrain } from '../world/Terrain.js';
//import simplex from '../simplex.js'

import { PTDresult } from '../types/interfaces/index.js';

import type { Scene } from '../Scene.js';
import { PlantsRenderPipeline } from '../GPU/RenderPipeLines/Plants.js';
import { Buffer, GPUBufferUsage } from '../GPU/Buffer/Buffer.js';

import type { Engine } from '../engine.js';
import { DrawableIndirect } from '../GPU/Drawables/DrawableIndirect.js';
import { GrassHeightAtCoordinates } from '../GPU/Shaders/grass/GrassHeightAtCoordinates.comp.js';
import { MainNode } from '../MainNode.js';
import { allocate_vec } from '../nodes/DataNode.js';
import { Buffer2, BufferUsageEnums } from '../GPU/Buffer/Buffer2.js';
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
        radius: 86,
    };
    //private offset: SharedArrayBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 2 * this.numBlades);
    #worker = new WorkerThread('grass.js');
    #ready: Promise<void>;
    public fillArea(area: PTDresult) {
        //let amount = 100000

        this.#ready.then(() => {
            // console.log('sending grass to worker, took ', new Date().getTime() - d);
            this.#worker.message(WorkerReturn.noReturn,
                'save',
                {
                    angle: area.rad,
                    area: area,
                },
                []);
        }).catch(err =>
            engine.showError(err));
    }
    constructor(
        scene: Scene,
        terrainP: Promise<Terrain>
    ) {
        super({
            label: 'Plants',
        });
        const indirectBuffer = Buffer.create(scene.gpu,
            4 * 4,
            [
                GPUBufferUsage.INDIRECT,
                GPUBufferUsage.COPY_DST
            ],
            'indirectBuffer');
        const positionGPU =  new Buffer2({
            gpu: scene.gpu,
            label: 'positionGPU',
            size: numBlades * 4 * 4,
            usages: BufferUsageEnums['VERTEX|COPY_DST'],
        });
        const shapeGPU = new Buffer2({
            gpu: scene.gpu,
            label: 'shapeGPU',
            size: numBlades * 4 * 4,
            usages: BufferUsageEnums['VERTEX|COPY_DST'],
        });
        const positionGPUSwap = new Buffer2({
            gpu: scene.gpu,
            label: 'positionGPUSwap',
            size: numBlades * 4 * 4,
            usages: BufferUsageEnums['STORAGE|COPY_SRC'],
        });
        const shapeGPUSwap = new Buffer2({
            gpu: scene.gpu,
            label: 'shapeGPUSwap',
            size: numBlades * 4 * 4,
            usages: BufferUsageEnums['STORAGE|COPY_SRC'],
        });
        if (engine.gpu) {
            const renderPipeline = engine.gpu.createRenderPipeline(PlantsRenderPipeline,
                {
                    cullMode: 'none',
                    stripIndexFormat: 'uint16',
                    topology: 'triangle-strip',
                },
                {
                    stride: 4,
                }
            );
            this.drawable = new DrawableIndirect({
                node: this,
                renderPipeline,
                vertexBuffers: [
                    {
                        stride: 4,
                        view: positionGPU,
                    },
                    {
                        stride: 4,
                        view: shapeGPU,
                    },
                    {
                        stride: 2,
                        view:
                    allocate_vec(
                        Float32Array.of(
                            0.02,
                            0.0,
                            -0.02,
                            0.0,
                            0.014,
                            0.29,
                            -0.014,
                            0.29,
                            0.007,
                            0.57,
                            -0.007,
                            0.57,
                            0.0,
                            1.0
                        )),
                    }
                ],
            },
            indirectBuffer);
        }

        const shapes = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 3 * numBlades);
        const noises = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * numBlades);
        //@ts-ignore
        window.downloadGrass = () => {
            caches.match(new Request('/grass')).then(async cachedgrass => {
                if (cachedgrass) {
                    console.log('grass',
                        URL.createObjectURL(await cachedgrass.blob()));
                }
            }).catch((e) => {
                console.error(e);
            });
        };

        this.#ready = terrainP.then(async terrain => {
            const getHeightAtCoordinatesShader = new GrassHeightAtCoordinates(Terrain.settings,
                scene.gpu);

            const computePipeline = await getHeightAtCoordinatesShader.createComputePipeline('main');

            this.#worker.subscribe('updated',
                (data: { buffer: SharedArrayBuffer }) => {
                    const commandEncoder = scene.gpu.device.createCommandEncoder({
                        label: 'plants_encoder',
                    });
                    const passEncoder = commandEncoder.beginComputePass({
                        label: 'plants_pass_encoder',
                    });
                    passEncoder.setPipeline(computePipeline);

                    const worldCopyGPU = Buffer.create(scene.gpu,
                        numBlades * 2 * 4,
                        [
                            GPUBufferUsage.STORAGE,
                            GPUBufferUsage.COPY_DST
                        ],
                        'worldCopyGPU',
                        (buffer) => {
                            const worldSetArr = buffer.getMappedRange();
                            new Uint8Array(worldSetArr).set(new Uint8Array(data.buffer));
                        });
                    const bindGroup2 = getHeightAtCoordinatesShader.props.bindGroupLayouts[1].createBindGroup('bindGroup2',
                        bg =>
                            ({
                                positions: worldCopyGPU.getStorageBinding(bg),
                            }));

                    passEncoder.setBindGroup(0,
                        bindGroup.bindGroup);
                    passEncoder.setBindGroup(1,
                        bindGroup2.bindGroup);
                    passEncoder.dispatchWorkgroups(numBlades);
                    passEncoder.end();

                    positionGPUSwap.copyTo(commandEncoder,
                        positionGPU,
                        0,
                        0,
                        numBlades * 4 * 4);

                    shapeGPUSwap.copyTo(commandEncoder,
                        shapeGPU,
                        0,
                        0,
                        numBlades * 4 * 4);
                    indirectBuffer.updateBufferRaw(commandEncoder,
                        new Uint32Array([
                            7,
                            (data.buffer.byteLength / 4) * 2
                        ]).buffer);
                    scene.gpu.pendingCommandBuffers.push(commandEncoder.finish());
                });
            await this.#worker.message(WorkerReturn.Promise,
                'init',
                {
                    noises: noises,
                    shape: shapes,
                },
                []);

            const bindGroup = getHeightAtCoordinatesShader.props.bindGroupLayouts[0].createBindGroup('bindGroup1',
                bindGroup1 =>
                    ({
                        facet12: terrain.facet12ArrGPUBuffer.getStorageBinding(bindGroup1),
                        positionAndRotate: positionGPUSwap.getStorageBinding(bindGroup1),
                        shapes: shapeGPUSwap.getStorageBinding(bindGroup1),
                        slopes: terrain.slopeArrGPUBuffer.getStorageBinding(bindGroup1),
                    }));
        }).catch(err =>
            engine.showError(err,
                scene.gpu));
    }
}