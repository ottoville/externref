import { paintGround } from "./paintGround.js";
import type { Terrain } from "../world/terrain.js";
//import { Vector3 } from "../lib/babylon/Maths/math.vector.js";
//import { MeshBuilder } from "../lib/babylon/Meshes/meshBuilder.js";

import type { ArcRotateCamera } from "../lib/babylon/Cameras/arcRotateCamera.js";
import { hasCanvasListener } from "../traits/canvasListener.js";
import { Sea } from "../world/water.js";
import type { Scene } from "../Scene.js";

export class paintLine extends paintGround {
    onEnd() { }
    //private startingPoint!: Float32Array;
    onMainPointerUp(/*height: number, end_position: Float32Array*/): void {
        //Todo, fix Y;
       // MeshBuilder.CreateLines("lines", { points: [new Vector3(this.startingPoint[0], 1, this.startingPoint[1]), new Vector3(end_position[0],1, end_position[1])] });
    }
    onMainPointerDown(/*startingPoint: Float32Array*/): void {
        //this.startingPoint = startingPoint;
    }
    async onAreaDraw(): Promise<void> {
    }
    constructor(
        protected scene: Scene,
        protected camera: ArcRotateCamera,
        protected ground: Terrain,
        protected sea: Sea,
        uitab: hasCanvasListener
    ) {
        super(scene, camera, ground, sea, uitab);
    };
}