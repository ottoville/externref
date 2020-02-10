import { paintGround } from "./paintGround.js";
import { UITAB } from "../UITAB.js";
import type { Terrain } from "../world/terrain.js";
import { Vector2, Vector3 } from "../lib/babylon/Maths/math.vector.js";
import { MeshBuilder } from "../lib/babylon/Meshes/meshBuilder.js";
import type { Scene } from "../lib/babylon/scene.js";
import type { Mesh } from "../lib/babylon/Meshes/mesh.js";
import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";

export class paintLine extends paintGround {
    private startingPoint: Vector2 = Vector2.Zero();;
    onMainPointerUp(end_position: Vector2, height: number): void {
        //Todo, fix Y;
        var lines = MeshBuilder.CreateLines("lines", { points: [new Vector3(this.startingPoint.x, 1, this.startingPoint.y), new Vector3(end_position.x,1, end_position.y)] });
    }
    onMainPointerDown(startingPoint: Vector2): void {
        this.startingPoint = startingPoint;
    }
    onAreaDraw(width: number): void {
    }
    constructor(
        public canvas: HTMLElement,
        protected scene: Scene,
        protected camera: ArcRotateCamera,
        protected ground: Terrain,
        protected sea: Mesh,
        uitab: UITAB
    ) {
        super(canvas, scene, camera, ground, sea, uitab);
    };
}