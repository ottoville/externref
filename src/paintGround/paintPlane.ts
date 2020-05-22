import { paintGround } from "./paintGround.js";
import { UITAB } from "../UITAB.js";
import type { Terrain } from "../world/terrain.js";

import type { PTResultF } from "../types/interfaces/index.js";
import { StandardMaterial } from "../lib/babylon/Materials/standardMaterial.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
import { Vector2 } from "../lib/babylon/Maths/math.vector.js";
import type { WorldScene } from "../world/scene.js";
import { TerraMesh } from "../TerraMesh.js";
import { SubMesh } from "../lib/babylon/Meshes/subMesh.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine.js";
import { Matrix } from "../lib/babylon/Maths/math.vector";

export class paintPlane extends paintGround {

    private forceSharedVertices = true;
    private tempplane: TerraMesh | null = null;
    #startingPoint: Vector2 = Vector2.Zero();
    #leftoverGPU: GPUBuffer;
    #worldCopyGPU: GPUBuffer;
    #updateWorldBuffer: GPUCommandBuffer[];
    private * createTiledGround(width: number): Generator<{ positions: number[], indices: number[] }, { positions: number[], indices: number[] }> {
        const positions:number[] = [0,0, 0,1];
        const indices: number[] = [0,1];
        let row = 0;
        let backwards = false;
        while (true) {
            if (row != 0) {
                if (!backwards)
                    indices.push((positions.push(0, row + 1) - 2) >> 1)
                else
                    indices.push((positions.push(width, row + 1) - 2) >> 1)
            }
            for (let i = 1; i <= width; i++) {
                if (!backwards) {
                    if(row==0)
                        indices.push((positions.push(i, row) - 2) >> 1)
                    else 
                        indices.push(indices[indices.length - i * 4]);
                    indices.push((positions.push(i, row + 1) - 2) >> 1);
                } else {
                    indices.push(indices[indices.length - i * 4]);
                    indices.push((positions.push(width - i, row + 1) - 2) >> 1)

                }
            }
            row++;
            backwards = !backwards
            yield { positions: positions, indices: indices };
        }
    }
    constructor(
        public canvas: HTMLElement,
        protected scene: WorldScene,
        protected camera: ArcRotateCamera,
        protected ground: Terrain,
        protected sea: Mesh,
        uitab: UITAB,
        private engine: WebGPUEngine,
        private device: GPUDevice,
        private shaderModules: Map<string, GPUShaderModule>
    ) {
        super(canvas, scene, camera, ground, sea, uitab);
        
    };
    #positionBuffer: GPUBuffer = null;
    #indexBuffer: GPUBuffer = null;
    #indicesCount: number = 0;
    public activate(callback: PTResultF, options: { forceSharedVertices?: boolean }) {
        this.#leftoverGPU = this.device.createBuffer({ size: 16 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.#worldCopyGPU = this.device.createBuffer({ size: 16 * 4, usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC });

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.#worldCopyGPU, 0,
            this.#leftoverGPU, 0,
            16 * 4);
        this.#updateWorldBuffer = [commandEncoder.finish()];

        super.activate(callback, options);
    }
    public deactivate() {
        super.deactivate();
        if (this.tempplane)
            this.tempplane.dispose();
        this.#leftoverGPU.destroy();
        this.#worldCopyGPU.destroy();
        this.#positionBuffer.destroy();
        this.#indexBuffer.destroy();
    }
    
    onMainPointerDown(startingPoint: Vector2) {
       
        this.#startingPoint = startingPoint;
    }
    #columns = 0;
    #rows = 1;
    #rowGenerator: Generator<{ positions: number[], indices: number[] }, { positions: number[], indices: number[] }>

    onMainPointerUp(end_position: Vector2, height: number): void {
        this.#columns = Math.floor(height / 10);
        this.#rowGenerator = this.createTiledGround(this.#columns);


        let values = this.#rowGenerator.next().value;
        this.#indicesCount = values.indices.length;
        this.tempplane = new TerraMesh("tempplane", new Float32Array(values.positions), new Uint32Array(values.indices));
        //this.tempplane = new TerraMesh("tempplane", new Float32Array([-5000, 50, -5000, 5000, 50, 5000, 5000, 50, -5000]), new Uint32Array([0, 1, 2]));
        this.tempplane._internalAbstractMeshDataInfo._visibility = 0;
        this.tempplane.geometry.getVertexBuffer("position").create();
        this.tempplane.alwaysSelectAsActiveMesh = true;
        const material = new StandardMaterial("tempplane", this.scene);
        this.tempplane.material = material;
        material.isReadyForSubMesh = () => true;

        //@ts-ignore
        this.tempplane.subMeshes[0]._materialEffect = {};

            material.bindForSubMesh = (world: Matrix, mesh: Mesh, subMesh: SubMesh): void => {
            };
            //const stages = effect._pipelineContext.stages;
        const renderPipeline = this.device.createRenderPipeline({
                //@ts-ignore
                sampleCount: this.engine._mainPassSampleCount,
                primitiveTopology: 'triangle-strip',
                rasterizationState: {
                    cullMode: 'none',
                },
                depthStencilState: {
                    depthWriteEnabled: false,
                    depthCompare: "less",
                    format: "depth24plus-stencil8",
                },
                colorStates: [{
                    format: "bgra8unorm",
                }],
                vertexStage: {
                    module: this.shaderModules.get("plane.vert"),
                    entryPoint: "main",
                 },
                fragmentStage: {
                    module: this.shaderModules.get("plane.frag"),
                    entryPoint: "main"
                },
                vertexState: {
                    indexFormat: 'uint16',
                    vertexBuffers:
                        [{
                            arrayStride: 4 * 2,
                            stepMode: "vertex" as GPUInputStepMode,
                            attributes: [{
                                // position
                                shaderLocation: 0,
                                offset: 0,
                                format: "float2" as GPUVertexFormat
                            }]
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
                            buffer: scene.getSceneUniformBuffer()._buffer.underlyingResource
                        }
                    }],
                }),
                this.device.createBindGroup({
                    layout: renderPipeline.getBindGroupLayout(1),
                    entries: [
                        {
                            binding: 0,
                            resource: {
                                //@ts-ignore
                                buffer: this.#leftoverGPU, //leftover
                            }
                        },
                        {
                            binding: 1,
                            resource: {
                                buffer: this.ground.slopeArrGPUBuffer
                            }
                        },
                        {
                            binding: 2,
                            resource: {
                                buffer: this.ground.facet1ArrGPUBuffer
                            }
                        },
                        {
                            binding: 3,
                            resource: {
                                buffer: this.ground.facet2ArrGPUBuffer
                            }
                        }
                    ],
                })
            ];
            this.tempplane._internalAbstractMeshDataInfo._visibility = 1;



            let [VGPU, VARR] = this.device.createBufferMapped({ size: values.positions.length * 4, usage: GPUBufferUsage.VERTEX });
            new Float32Array(VARR).set(values.positions);
            VGPU.unmap()


            let [IGPU, IARR] = this.device.createBufferMapped({ size: values.indices.length * Uint16Array.BYTES_PER_ELEMENT, usage: GPUBufferUsage.INDEX });
            new Uint16Array(IARR).set(values.indices);
            IGPU.unmap();


            this.#positionBuffer = VGPU;
            this.#indexBuffer = IGPU;

            const engine = this.engine;
            this.tempplane.position.x = this.#startingPoint.x - 0.5
            this.tempplane.position.y = 5;
            this.tempplane.position.z = this.#startingPoint.y - 1;

            this.tempplane.scaling.x = height / this.#columns;
            this.tempplane.rotation.y = this.ang360.rad - Math.PI;


           // (this.tempplane.subMeshes[0].effect._pipelineContext as WebGPUPipelineContext).uniformBuffer.updateMatrix('world', this.tempplane.getWorldMatrix());
            this.tempplane._draw = (subMesh: SubMesh, fillMode: number, instancesCount?: number): Mesh => {
                if (!this.tempplane._geometry || !this.tempplane._geometry.getVertexBuffers() || (!this.tempplane._unIndexed && !this.tempplane._geometry.getIndexBuffer()) ) {
                    
                    return this.tempplane;
                }
                //@ts-ignore
                if (this.tempplane._internalMeshDataInfo._onBeforeDrawObservable) {
                    //@ts-ignore
                    this.tempplane._internalMeshDataInfo._onBeforeDrawObservable.notifyObservers(this.tempplane);
                }

                //@ts-ignore
                engine._currentIndexBuffer = null;
                //@ts-ignore
                const renderPass = engine._bundleEncoder || engine._currentRenderPass!;

                renderPass.setPipeline(renderPipeline);
                renderPass.setIndexBuffer(this.#indexBuffer, 0);
                renderPass.setVertexBuffer(0, this.#positionBuffer);
                //@ts-ignore
                engine._setRenderBindGroups(bindGroups);
                if (engine._alphaState.alphaBlend && engine._alphaState._isBlendConstantsDirty) {
                    // TODO WebGPU. should use renderPass.
                    //@ts-ignore
                    engine._currentRenderPass!.setBlendColor(engine._alphaState._blendConstants as any);
                }
                renderPass.drawIndexed(this.#indicesCount, 1, 0, 0, 0);
                return this.tempplane;
            }
        console.log('onMainPointerUp');

    }

    async onAreaDraw(width: number): Promise<void> {
        if (!this.tempplane)
            throw (new Error('templane object has not been initalized'));
        const leftoverARR = await this.#worldCopyGPU.mapWriteAsync();
        const newRows = Math.floor(width / 10);
        let newValues: { positions: number[], indices: number[] };
        let updateIndices = false;
        if (newRows > this.#rows) {
            do {
                newValues = this.#rowGenerator.next().value;
            } while (++this.#rows < newRows);
            updateIndices = true;

        }
        this.tempplane.scaling.z = width / this.#rows;
        
        new Float32Array(leftoverARR).set(this.tempplane.getWorldMatrix().m);
        this.#worldCopyGPU.unmap();
        this.device.defaultQueue.submit(this.#updateWorldBuffer);
        if (updateIndices) {
            let [VGPU, VARR] = this.device.createBufferMapped({ size: newValues.positions.length * 4, usage: GPUBufferUsage.VERTEX });
            new Float32Array(VARR).set(newValues.positions);
            VGPU.unmap()

            let [IGPU, IARR] = this.device.createBufferMapped({ size: newValues.indices.length * Uint16Array.BYTES_PER_ELEMENT, usage: GPUBufferUsage.INDEX });
            new Uint16Array(IARR).set(newValues.indices);
            IGPU.unmap();
            queueMicrotask(() => {
                this.#indexBuffer.destroy();
                this.#indexBuffer = IGPU;
                this.#positionBuffer.destroy();
                this.#positionBuffer = VGPU;
                this.#indicesCount = newValues.indices.length
            })
        }
    }
}