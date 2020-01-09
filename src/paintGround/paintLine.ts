import { paintGround } from "./paintGround.js";

export class paintLine extends paintGround {
    private subTextureCache: subTexture | null;
    private startingPoint: Vector2;
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
        protected ground: BABYLON.GroundMesh,
        protected sea: BABYLON.Mesh,
    ) {
        super(canvas, scene, camera, ground, sea);
    };
}