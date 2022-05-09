import type { Scene } from "../../Scene.js";
import { SimpleMesh } from "../AbstractMeshes/SimpleMesh.js";

const positions = new Float32Array([
    // positions        //normals
    -1.0, 1.0, -1.0,    0.0,1.0,0.0,
    -1.0, 1.0, 1.0,     0.0,1.0,0.0,
    -1.0, -1.0, 1.0,    0.0,1.0,0.0,
])

let uid=0;
export class Triangle extends SimpleMesh {
    constructor(
        label='triangle'+(uid++),
        color:[number,number,number,number]=[1,0,0,0],
        has_physic=false,
        scenes?: Scene[],
    ) {
        super(positions,label,has_physic, undefined, scenes)
        this.gpu_custom_data=color;
    }
}