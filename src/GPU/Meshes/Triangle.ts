import type { Scene } from "../../Scene.js";
import { SimpleMesh } from "../AbstractMeshes/SimpleMesh.js";
import { Engine } from "../../engine.js";
import { new_rust_mesh } from "MainNode.js";

declare const engine: Engine;

const positions = new Float32Array([
    // positions        //normals
    -1.0, 1.0, -1.0, 1.0, 0.0, 1.0, 0.0, 1,0
    -1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0,1,0
    -1.0, -1.0, 1.0, 1.0, 0.0, 1.0, 0.0,1,0
])

let uid = 0;
export class Triangle extends SimpleMesh {
    constructor(
        label = 'triangle' + (uid++),
        color: [number, number, number, number] = [1, 0, 0, 0],
        can_collide = false,
        scenes?: Scene[],
    ) {
        super(
            {
                vertices: {
                    view: positions
                },
                can_collide
            },
            new_rust_mesh({
                label,
                scenes,
                fixed: true
            })
        )
        this.color = color;
    }
}