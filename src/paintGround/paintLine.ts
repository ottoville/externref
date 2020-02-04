import { paintGround } from "./paintGround.js";
import { UITAB } from "../UITAB.js";
import { Terrain } from "../world/terrain.js";

export class paintLine extends paintGround {
    private startingPoint: Vector2 = Vector2.Zero();;
    onMainPointerUp(end_position: Vector2, height: number): void {
        //Todo, fix Y;
        var lines = BABYLON.MeshBuilder.CreateLines("lines", { points: [new BABYLON.Vector3(this.startingPoint.x, 1, this.startingPoint.y), new BABYLON.Vector3(end_position.x,1, end_position.y)] });
    }
    onMainPointerDown(startingPoint: Vector2): void {
        this.startingPoint = startingPoint;
    }
    onAreaDraw(width: number): void {
    }
    constructor(
        public canvas: HTMLElement,
        protected scene: BABYLON.Scene,
        protected camera: BABYLON.ArcRotateCamera,
        protected ground: Terrain,
        protected sea: BABYLON.Mesh,
        uitab: UITAB
    ) {
        super(canvas, scene, camera, ground, sea, uitab);
    };
}