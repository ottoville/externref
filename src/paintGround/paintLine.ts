import { paintGround } from "./paintGround.js";

export class paintLine extends paintGround {
    private subTextureCache: subTexture | null;
    private startingPoint: Vector3;
    onMainPointerUp(end_position: Vector3, height: number): void {
        var lines = BABYLON.MeshBuilder.CreateLines("lines", { points: [<BABYLON.Vector3><unknown>this.startingPoint, <BABYLON.Vector3><unknown>end_position] });
    }
    onMainPointerDown(startingPoint: Vector3): void {
        this.startingPoint = startingPoint;
    }
    onAreaDraw(width: number): void {
    }
    constructor(
        public canvas: HTMLElement,
        protected scene: BABYLON.Scene,
        protected camera: BABYLON.ArcRotateCamera,
        protected ground: BABYLON.GroundMesh,
        protected sea: BABYLON.Mesh,
    ) {
        super(canvas, scene, camera, ground, sea);
    };
}