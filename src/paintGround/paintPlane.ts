import { paintGround } from "./paintGround.js";
import type { Terrain } from "../world/terrain.js";
import type { PTResultF } from "../types/interfaces/index.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
import { Vector2, Vector3 } from "../lib/babylon/Maths/math.vector.js";
import type { WorldScene } from "../world/scene.js";
import type { WebGPUEngine } from "../lib/babylon/Engines/webgpuEngine.js";
import { worldPosition, has3DPosition } from "../traits/worldPosition.js";
import { canvasListener } from "../traits/canvasListener.js";
import { GPUScene } from "../GPUScene.js";
import type { Drawable } from "../drawables/Drawable.js";
import { TerraNode } from "../TerraNode.js";



export class paintPlane extends paintGround implements has3DPosition {
    //@ts-ignore TODO: move mesh to external object or make this inherit from terranode
    worldPosition = new worldPosition(this as TerraNode);
    #startingPoint: Vector2 = Vector2.Zero();
    #templane2: Drawable;
    private * createTiledGround(width: number): Generator<{ positions: number[], indices: number[] }, null, { positions: number[], indices: number[] }> {
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
        protected scene: WorldScene,
        protected camera: ArcRotateCamera,
        protected ground: Terrain,
        protected sea: Mesh,
        uitab: canvasListener,
        private engine: WebGPUEngine
    ) {
        super(scene, camera, ground, sea, uitab);
        
        this.#templane2 = ground.TerrainHeightsbindGroupPositionTree.addDrawable({
            //@ts-ignore
            sampleCount: this.engine._mainPassSampleCount,
            primitiveTopology: 'triangle-strip',
            rasterizationState: {
                cullMode: 'none',
            },
            colorStates: [{
                format: "bgra8unorm",
            }],
            vertexStage: {
                module: GPUScene.instance.shaderModules.get("plane.vert")!,
                entryPoint: "main",
            },
            fragmentStage: {
                module: GPUScene.instance.shaderModules.get("plane.frag")!,
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
            }, //@ts-ignore TODO: move mesh to external object or make this inherit from terranode
        }, [this.worldPosition.bufferOffset], 0, 1, 0, 0);
    };

    public activate(callback: PTResultF, options: { forceSharedVertices?: boolean }) {
        super.activate(callback, options);
    }
    public destroy() {
        super.destroy();
        this.#templane2.destroy();
       // this.#leftoverGPU.destroy();
       // this.#worldCopyGPU.destroy();
        this.#columns = 0;
        this.#rows = 0;
       // this.#rowGenerator.return(null);
    }

    onMainPointerDown(startingPoint: Vector2) {

        this.#startingPoint = startingPoint;
    }
    #columns = 0;
    #rows = 0;
    #rowGenerator: Generator<{ positions: number[], indices: number[] }, null, { positions: number[], indices: number[] }> | null = null;

    onMainPointerUp(end_position: Vector2, height: number): void {
        this.#columns = Math.floor(height / 10);
        //this.#rowGenerator = this.createTiledGround(this.#columns);

       // const values : { positions: number[], indices: number[] } |null = this.#rowGenerator.next().value;
       // if (!values)
       //     throw (new Error('unexpected return from generator'));

       // this.#templane2.indexOrVertexCount = values.indices.length;


      //  this.#templane2.setIndexBuffer(new Uint16Array(values.indices).buffer);
       // this.#templane2.setVertexBuffer(0, new Float32Array(values.positions).buffer);


        this.worldPosition.translation[0] = this.#startingPoint.x - 0.5
        this.worldPosition.translation[1] = 5;
        this.worldPosition.translation[2] = this.#startingPoint.y - 1;

        this.worldPosition.scaling[0] = height / this.#columns;
        const rotQ = new Vector3(0, this.ang360.rad - Math.PI, 0).toQuaternion();
        this.worldPosition.rotation = [rotQ.x, rotQ.y, rotQ.z, rotQ.w];
        console.log('onMainPointerUp');

    }

    async onAreaDraw(width: number): Promise<void> {
        let newValues: { positions: number[], indices: number[] } | null = null;
        if (!this.#rowGenerator) {
            console.log('create row generator');
            this.#rowGenerator = this.createTiledGround(this.#columns);
           // newValues=  this.#rowGenerator.next().value;
        }
        
        const newRows = Math.max(1,Math.floor(width / 10));
        if (newRows > this.#rows) {
            do {
                console.log('increase rows from ', this.#rows)
                newValues = this.#rowGenerator.next().value;
            } while (++this.#rows < newRows);
        }

        this.worldPosition.scaling[2] = width / this.#rows;
    /*    let testM = new Matrix();
        
        Matrix.ComposeToRef(this.#scaling, this.#rotation.toQuaternion(), this.#position, testM);
        const leftoverARR = await this.#worldCopyGPU.mapWriteAsync();
        new Float32Array(leftoverARR).set(testM.m);
        this.#worldCopyGPU.unmap();
        this.device.defaultQueue.submit(this.#updateWorldBuffer);*/
         //@ts-ignore TODO: move mesh to external object or make this inherit from terranode
        this.worldPosition.updatePositionBuffer();
        if (newValues) {
            console.log('update plane buffer ', newValues.indices.length);
            this.#templane2.setVertexBuffer(0, new Float32Array(newValues.positions));
            this.#templane2.setIndexBuffer(new Uint16Array(newValues.indices));
            this.#templane2.indexOrVertexCount = newValues.indices.length;
        }
    }
}
//export const paintPlane = applyMixins<typeof BasePaintPlane>(BasePaintPlane as TraitableClassLike, [worldPosition]);
