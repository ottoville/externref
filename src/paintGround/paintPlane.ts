import { paintGround } from "./paintGround.js";
import { Terrain } from "../world/Terrain.js";
import type { PTResultF } from "../types/interfaces/index.js";
import type { Scene } from "../Scene.js";
import type { GPU } from "../GPU.js";

import { TerraVector2 } from "../Math.js";
import { DrawableIndexed } from "../GPU/Drawables/DrawableIndexed.js";
import type { Engine } from "../engine.js";
import { BoundableNodeIndexed } from "../nodes/BoundableNodeIndexed.js";
import { PlaneAtGroundHeightVertShader } from "../GPU/Shaders/PlaneAtGroundHeight.vert.js";
import type { RenderPipeline } from "../GPU/RenderPipeline2.js";
import { ColorFragShader } from "../GPU/Shaders/Color.frag.js";
import { createTiledGround } from "../helpers.js";
declare const engine: Engine;

class PlaneMesh extends BoundableNodeIndexed {
    //indices_count=0;
    drawable: DrawableIndexed<RenderPipeline<PlaneAtGroundHeightVertShader>>;
    constructor(renderPipeline: RenderPipeline<PlaneAtGroundHeightVertShader>, vertexBuffer: Float32Array) {
        super(
            {
                vertices: vertexBuffer,
                verticesPositionStride: 2,
                character_can_collide_to: false
            },
            {
                label: 'plane',
                rigid_body: false,
            },
            new Uint32Array());
        //super({ positionsCount: verticesCount, label: 'plane'});
        this.drawable = new DrawableIndexed(
            {
                renderPipeline,
                vertexBuffers: [vertexBuffer]
            },
            {
                node: this,
            });
    }
}

const renderPipelines: Map<GPU, RenderPipeline<PlaneAtGroundHeightVertShader>> = new Map();
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
        let renderPipeline = renderPipelines.get(scene.gpu);
        if (!renderPipeline) {
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
            renderPipeline = ground.TerrainHeightsbindGroupTree.addRenderPipeline(
                {
                    label: 'paintPlaneRenderpipeline',
                    vertexShader: planeVertShader,
                    fragmentShader: new ColorFragShader(ground.TerrainHeightsbindGroupTree),
                    renderPipeline: {
                        primitive: { topology: 'triangle-strip', cullMode: 'none', stripIndexFormat: 'uint32' },
                    }
                });
            renderPipelines.set(scene.gpu, renderPipeline);
        }
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

        engine.rust.update_scale_and_rotation(this.#mesh.ptr, height / this.#columns, this.#mesh.scale_y, this.#mesh.scale_z,
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
            this.#mesh.drawable.setIndexBuffer(new Uint32Array(newValues.indices));
            this.#mesh.indices_count = newValues.indices.length;
        }
    }
}