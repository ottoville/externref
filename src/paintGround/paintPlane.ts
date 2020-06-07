import { paintGround } from "./paintGround.js";
import { UITAB } from "../UITAB.js";
import type { Terrain } from "../world/terrain.js";
import type { PTResultF } from "../types/interfaces/index.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
import { Vector2, Vector3 } from "../lib/babylon/Maths/math.vector.js";
import type { WorldScene } from "../world/scene.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine.js";
import { Matrix } from "../lib/babylon/Maths/math.vector";
import { UIMesh } from "../UIMesh.js";

export class paintPlane extends paintGround {

    #scaling = new Vector3();
    #rotation = new Vector3();
    #position = new Vector3();
    //private tempplane: TerraMesh | null = null;
    #startingPoint: Vector2 = Vector2.Zero();
    #leftoverGPU: GPUBuffer;
    #worldCopyGPU: GPUBuffer;
    #updateWorldBuffer: GPUCommandBuffer[];
    #templane2: UIMesh;
    private * createTiledGround(width: number): Generator<{ positions: number[], indices: number[] }, { positions: number[], indices: number[] }> {
        const positions: number[] = [0, 0, 0, 1];
        const indices: number[] = [0, 1];
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
                    if (row == 0)
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
        this.#leftoverGPU.destroy();
        this.#worldCopyGPU.destroy();
        this.#templane2.destroy();
        this.#columns = 0;
        this.#rows = 1;
        this.#rowGenerator.return(null);
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

        const renderDesc: GPURenderPipelineDescriptor = {
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [this.scene.uniformBindGroupLayout, this.ground.bindGroupLayout, UIMesh.positionLayout]
            }),
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
        };
        const renderPipeline = this.device.createRenderPipeline(renderDesc);
        this.#templane2 = new UIMesh(renderPipeline, new Set([
           this.device.createBindGroup({
                layout: UIMesh.positionLayout,
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.#leftoverGPU
                        }
                    }
                ],
            })
        ]), values.indices.length); //new Uint16Array(values.indices), new Map([[0,new Float32Array(values.positions)]])

        this.#templane2.setIndexBuffer(new Uint16Array(values.indices).buffer);
        this.#templane2.setVertexBuffer(0, new Float32Array(values.positions).buffer);

        this.#position.x = this.#startingPoint.x - 0.5
        this.#position.y = 5;
        this.#position.z = this.#startingPoint.y - 1;

        this.#scaling.x = height / this.#columns;
        this.#rotation.y = this.ang360.rad - Math.PI;
        console.log('onMainPointerUp');

    }

    async onAreaDraw(width: number): Promise<void> {
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

        this.#scaling.z = width / this.#rows;
        let testM = new Matrix();
        Matrix.ComposeToRef(this.#scaling, this.#rotation.toQuaternion(), this.#position, testM);
        new Float32Array(leftoverARR).set(testM.m);
        this.#worldCopyGPU.unmap();
        this.device.defaultQueue.submit(this.#updateWorldBuffer);
        if (updateIndices) {
            this.#templane2.setVertexBuffer(0, new Float32Array(newValues.positions).buffer);
            this.#templane2.setIndexBuffer(new Uint16Array(newValues.indices).buffer);
            this.#templane2.indexOrVertexCount = newValues.indices.length;
        }
    }
}