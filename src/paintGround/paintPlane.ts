import { paintGround } from "./paintGround.js";
import type { Terrain } from "../world/terrain.js";
import { PTResultF } from "../types/interfaces/index.js";
import { hasCanvasListener } from "../traits/canvasListener.js";
import { MainNode } from "../MainNode.js";
import { Sea } from "../world/water.js";
import type { Scene } from "../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../GPU/RenderPipeline.js";
import type { GPU } from "../GPU.js";

import { TerraVector2 } from "../Math.js";
import { DrawableIndexed } from "GPU/Drawable.js";
import type { IndexedNode } from "../DataNode.js";
import type { Engine } from "engine.js";
declare const engine:Engine;



class PlaneMesh extends MainNode implements IndexedNode {
    indices_count=0;
    drawable:DrawableIndexed;
    constructor(renderPipeline: RenderPipeline, verticesCount: number) {
        super(undefined, undefined, verticesCount);
        this.drawable=renderPipeline.addDrawableIndexed(this, 'plane',undefined,undefined, 0, 1, 0);
    }
}

const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function getRenderPipeline(scene: Scene, ground: Terrain): RenderPipeline {
    let renderPipeline: RenderPipeline | undefined = renderPipelines.get(scene.gpu);
    if (renderPipeline) {
        return renderPipeline;
    }
    renderPipeline = ground.TerrainHeightsbindGroupTree.addRenderPipeline(new VertexShader(engine.gpu,'plane.vert.wgsl', 'main', [{
        arrayStride: 4 * 2,
        stepMode: "vertex" as GPUInputStepMode,
        attributes: [{
            // position
            shaderLocation: 0,
            offset: 0,
            format: "float32x2"
        }]
    }]), new Shader(engine.gpu,'UIColor.frag.wgsl'), {
        primitive: { topology: 'triangle-strip', cullMode: 'none', stripIndexFormat:'uint32' },
    });
    renderPipelines.set(scene.gpu, renderPipeline);
    return renderPipeline
}
export class paintPlane extends paintGround {
    #mesh:PlaneMesh
    constructor(
        scene: Scene,
        ground: Terrain,
        sea: Sea,
        uitab: hasCanvasListener,
        callback: PTResultF
    ) {
        super(scene, ground, sea, uitab,(p) => {
            this.#mesh.update_scale(engine.rustEngine,this.#mesh.scale_x, this.#mesh.scale_y, 0)
            callback(p);
        });
        this.#mesh = new PlaneMesh(getRenderPipeline(scene, ground), 0);
        this.#mesh.drawable.setVertexBuffer(0, new Float32Array([0, 0, 0]));
    }
    #startingPoint = new TerraVector2(2);
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
                        indices.push(indices[indices.length - i * 4]!);
                    indices.push((positions.push(i, row + 1) - 2) >> 1);
                } else {
                    indices.push(indices[indices.length - i * 4]!);
                    indices.push((positions.push(width - i, row + 1) - 2) >> 1)

                }
            }
            row++;
            backwards = !backwards
            yield { positions: positions, indices: indices };
        }
    }
    /*public activate(callback: PTResultF) {
        super.activate(callback);
    }*/
    override destroy() {
        super.destroy();
        this.#mesh.destroy();
        this.#mesh.drawable.destroy();
        this.#columns = 0;
        this.#rows = 0;
    }

    onMainPointerDown(startingPoint: TerraVector2) {
        this.#startingPoint = startingPoint;
    }
    #columns = 0;
    #rows = 0;
    #rowGenerator: Generator<{ positions: number[], indices: number[] }, null, { positions: number[], indices: number[] }> | null = null;

    onMainPointerUp(height: number): void {
        this.#rowGenerator = null;
        this.#rows = 0;
        this.#columns = Math.floor(height / 10);
        this.#mesh.get_translation().set([this.#startingPoint[0] - 0.5,5, this.#startingPoint[1] - 1])
       /* this.#mesh.translation[0] = this.#startingPoint[0] - 0.5
        this.#mesh.translation[1] = 5;
        this.#mesh.translation[2] = this.#startingPoint[1] - 1;*/

        // const rotQ = Quaternion.RotationYawPitchRoll(this.ang360.rad - Math.PI, 0, 0)
        //Quaternion.RotationYawPitchRollToRef(this.ang360.rad - Math.PI, 0, 0, rotQ);
        // Produces a quaternion from Euler angles in the z-y-x orientation (Tait-Bryan angles)

        const halfYaw = (this.ang360.rad - Math.PI) * 0.5;

        this.#mesh.update_scale_and_rotation(engine.rustEngine,
            height / this.#columns, this.#mesh.scale_y, this.#mesh.scale_z,
            0, Math.sin(halfYaw), 0, Math.cos(halfYaw))
    }

    async onAreaDraw(width: number): Promise<void> {
        let newValues: { positions: number[], indices: number[] } | null = null;
        if (!this.#rowGenerator) {
            this.#rowGenerator = this.createTiledGround(this.#columns);
        }

        const newRows = Math.max(1, Math.floor(width / 10));
        if (newRows > this.#rows) {
            do {
                newValues = this.#rowGenerator.next().value;
            } while (++this.#rows < newRows);
        }
        this.#mesh.update_scale(engine.rustEngine,this.#mesh.scale_x, this.#mesh.scale_y, width / this.#rows)

        if (newValues) {
            this.#mesh.drawable.setVertexBuffer(0, new Float32Array(newValues.positions));
            this.#mesh.drawable.setIndexBuffer(new Uint32Array(newValues.indices));
            this.#mesh.indices_count = newValues.indices.length;
        }
    }
}