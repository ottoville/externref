import { paintGround } from "./paintGround.js";
import { Terrain } from "../world/Terrain.js";
import type { PTResultF } from "../types/interfaces/index.js";
import type { Scene } from "../Scene.js";

import { TerraVector2 } from "../Math.js";
import { DrawableIndexed } from "../GPU/Drawables/DrawableIndexed.js";
import type { Engine } from "../engine.js";
import { NodeIndexed } from "../nodes/NodeIndexed.js";
import { PlaneAtGroundHeightVertShader } from "../GPU/Shaders/PlaneAtGroundHeight.vert.js";
import type { RenderPipeline } from "../GPU/RenderPipeline.js";
import { ColorFragShader } from "../GPU/Shaders/Color.frag.js";
import { createTiledGround } from "../helpers.js";
import { new_rust_mesh } from "../MainNode.js";
declare const engine: Engine;

class PlaneMesh extends NodeIndexed {
    drawable: DrawableIndexed<RenderPipeline<PlaneAtGroundHeightVertShader>>;
    constructor(renderPipeline: RenderPipeline<PlaneAtGroundHeightVertShader>, vertexBuffer: Float32Array) {
        const mesh_id = new_rust_mesh({
            label: 'plane',
            rigid_body: false,
        });
        super(
            {
                vertices: {
                    view: vertexBuffer,
                    stride: 2
                },
                character_can_collide_to: false
            },
            mesh_id,
            false,
            new Uint32Array());
        this.drawable = new DrawableIndexed(
            {
                renderPipeline,
                vertexBuffers: [vertexBuffer],
                node: this,
            });
    }
}

export class paintPlane extends paintGround {
    #mesh: PlaneMesh
    constructor(
        scene: Scene,
        ground: Terrain,
        callback: PTResultF
    ) {
        super(scene, ground, (p) => {
            this.#mesh.update_scale(this.#mesh.scale_x, this.#mesh.scale_y, 0)
            callback(p);
        });

        const renderPipeline = ground.gpu.createRenderPipeline([
            'paintPlaneRenderpipeline', (_gpu, label, primitive) => {
                const planeVertShader = new PlaneAtGroundHeightVertShader(
                    ground.TerrainHeightsbindGroupTree,
                    {
                        arrayStride: 4 * 2,
                        stepMode: "vertex" as GPUVertexStepMode,
                        attributes: [
                            {
                                // position
                                shaderLocation: 0,
                                offset: 0,
                                format: "float32x2"
                            }
                        ]
                    }, Terrain.settings
                )
                return ground.TerrainHeightsbindGroupTree.addRenderPipeline(
                    {
                        label,
                        vertexShader: planeVertShader,
                        fragmentShader: new ColorFragShader(ground.TerrainHeightsbindGroupTree),
                        renderPipeline: {
                            primitive,
                        }
                    });
            }
        ], { topology: 'triangle-strip', cullMode: 'none', stripIndexFormat: 'uint32' })

        this.#mesh = new PlaneMesh(renderPipeline, new Float32Array([0, 0, 0]));
        this.#mesh.drawable.setVertexBuffer(0, new Float32Array([0, 0, 0]));
    }
    #startingPoint = new TerraVector2(2);
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
    #rowGenerator: Generator<{ positions: number[], indices: number[] }, { positions: number[], indices: number[] }> | null = null;

    onMainPointerUp(height: number): void {
        this.#rowGenerator = null;
        this.#rows = 0;
        this.#columns = Math.floor(height / 10);
        this.#mesh.translation = [this.#startingPoint[0] - 0.5, 5, this.#startingPoint[1] - 1];
        /* this.#mesh.translation[0] = this.#startingPoint[0] - 0.5
         this.#mesh.translation[1] = 5;
         this.#mesh.translation[2] = this.#startingPoint[1] - 1;*/

        // const rotQ = Quaternion.RotationYawPitchRoll(this.ang360.rad - Math.PI, 0, 0)
        //Quaternion.RotationYawPitchRollToRef(this.ang360.rad - Math.PI, 0, 0, rotQ);
        // Produces a quaternion from Euler angles in the z-y-x orientation (Tait-Bryan angles)

        const halfYaw = (this.ang360.rad - Math.PI) * 0.5;

        engine.rust.update_scale_and_rotation(this.#mesh.id, height / this.#columns, this.#mesh.scale_y, this.#mesh.scale_z,
            0, Math.sin(halfYaw), 0, Math.cos(halfYaw))
    }

    onAreaDraw(width: number) {
        let newValues: { positions: number[], indices: number[] } | null = null;
        if (!this.#rowGenerator) {
            this.#rowGenerator = createTiledGround(this.#columns);
        }

        const newRows = Math.max(1, Math.floor(width / 10));
        if (newRows > this.#rows) {
            do {
                newValues = this.#rowGenerator.next().value;
            } while (++this.#rows < newRows);
        }
        this.#mesh.update_scale(this.#mesh.scale_x, this.#mesh.scale_y, width / this.#rows)

        if (newValues) {
            this.#mesh.drawable.setVertexBuffer(0, new Float32Array(newValues.positions));
            this.#mesh.set_indices(new Uint32Array(newValues.indices));
        }
    }
}