import { paintGround } from "./paintGround.js";
import type { Terrain } from "../world/terrain.js";
//import { Vector3 } from "../lib/babylon/Maths/math.vector.js";
//import { MeshBuilder } from "../lib/babylon/Meshes/meshBuilder.js";

import type { Scene } from "../Scene.js";

export class paintLine extends paintGround {
    onMainPointerUp(/*height: number, end_position: Float32Array*/): void {
        //Todo, fix Y;
       // MeshBuilder.CreateLines("lines", { points: [new Vector3(this.startingPoint[0], 1, this.startingPoint[1]), new Vector3(end_position[0],1, end_position[1])] });
    }
    onMainPointerDown(/*startingPoint: Float32Array*/): void {
        //this.startingPoint = startingPoint;
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onAreaDraw() {
    }
    constructor(
        scene: Scene,
        ground: Terrain,
    ) {
        super(scene, ground, () => null);
    }
}