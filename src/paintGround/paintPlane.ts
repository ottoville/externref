import { paintGround } from "./paintGround.js";
import type { Terrain } from "../world/terrain.js";
import type { PTResultF } from "../types/interfaces/index.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
import type { WorldScene } from "../world/scene.js";
import { worldPosition, has3DPosition } from "../traits/worldPosition.js";
import { canvasListener } from "../traits/canvasListener.js";
import { GPUScene } from "../GPUScene.js";
import type { Drawable, RenderPipeLine } from "../drawables/Drawable.js";
import { TerraNode } from "../TerraNode.js";
import { TerraScene } from "../TerraScene.js";



class PlaneMesh extends TerraNode implements has3DPosition{
    worldPosition: worldPosition = new worldPosition(this);
}


export class paintPlane extends paintGround {

   // worldPosition = new worldPosition(this as TerraNode);
    #mesh = new PlaneMesh(this.scene);
    #startingPoint: Float32Array = new Float32Array(2);
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
        protected scene: TerraScene,
        protected sceneDeprecated: WorldScene,
        protected camera: ArcRotateCamera,
        protected ground: Terrain,
        protected sea: Mesh,
        uitab: canvasListener,
    ) {
        super(scene,camera, ground, sea, uitab);
        
        const planeRenerPipeline = ground.TerrainHeightsbindGroupPositionTree.addRenderPipeline({
            sampleCount: this.scene.gpuscene.sampleCount,
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
                indexFormat: 'uint32',
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
        }, [this.#mesh.bufferOffset]);
        this.#templane2 = planeRenerPipeline.addDrawable(0, 1, 1, 0)
    };

    public activate(callback: PTResultF, options: { forceSharedVertices?: boolean }) {
        super.activate(callback, options);
    }
    public destroy() {
        super.destroy();
        this.#templane2.destroy();
        this.#columns = 0;
        this.#rows = 0;
    }

    onMainPointerDown(startingPoint: Float32Array) {

        this.#startingPoint = startingPoint;
    }
    #columns = 0;
    #rows = 0;
    #rowGenerator: Generator<{ positions: number[], indices: number[] }, null, { positions: number[], indices: number[] }> | null = null;

    onMainPointerUp(end_position: Float32Array, height: number): void {
        this.#columns = Math.floor(height / 10);
        //this.#rowGenerator = this.createTiledGround(this.#columns);

       // const values : { positions: number[], indices: number[] } |null = this.#rowGenerator.next().value;
       // if (!values)
       //     throw (new Error('unexpected return from generator'));

       // this.#templane2.indexOrVertexCount = values.indices.length;


      //  this.#templane2.setIndexBuffer(new Uint16Array(values.indices).buffer);
       // this.#templane2.setVertexBuffer(0, new Float32Array(values.positions).buffer);


        this.#mesh.worldPosition.translation[0] = this.#startingPoint[0] - 0.5
        this.#mesh.worldPosition.translation[1] = 5;
        this.#mesh.worldPosition.translation[2] = this.#startingPoint[1] - 1;

        const rotQ = Quaternion.RotationYawPitchRoll(this.ang360.rad - Math.PI, 0, 0)

        this.#mesh.worldPosition.update((scaling, rotation) => {
            scaling[0] = height / this.#columns;
            rotation.set([rotQ.x, rotQ.y, rotQ.z, rotQ.w]);
        })


        //this.#mesh.worldPosition.scalingX = height / this.#columns;
        
        //const rotQ = new Vector3(0, this.ang360.rad - Math.PI, 0).toQuaternion();
        //this.#mesh.worldPosition.rotation = [rotQ.x, rotQ.y, rotQ.z, rotQ.w];
     //   this.#mesh.updateDynamicBuffer();
        console.log('onMainPointerUp', this.#columns);
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
               // console.log('increase rows from ', this.#rows)
                newValues = this.#rowGenerator.next().value;
            } while (++this.#rows < newRows);
        }
        this.#mesh.worldPosition.update((scaling, rotation) => {
            scaling[2] = width / this.#rows;
        })
      //  this.#mesh.worldPosition.scalingZ = width / this.#rows;
    /*    let testM = new Matrix();
        
        Matrix.ComposeToRef(this.#scaling, this.#rotation.toQuaternion(), this.#position, testM);
        const leftoverARR = await this.#worldCopyGPU.mapWriteAsync();
        new Float32Array(leftoverARR).set(testM.m);
        this.#worldCopyGPU.unmap();
        this.device.defaultQueue.submit(this.#updateWorldBuffer);*/

        if (newValues) {
            this.#templane2.setVertexBuffer(0, new Float32Array(newValues.positions));
            this.#templane2.setIndexBuffer(new Uint32Array(newValues.indices));
            this.#templane2.indexOrVertexCount = newValues.indices.length;
        }
    }
}
//export const paintPlane = applyMixins<typeof BasePaintPlane>(BasePaintPlane as TraitableClassLike, [worldPosition]);
