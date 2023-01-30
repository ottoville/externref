import type { Scene } from "../../Scene.js";
import { SimpleIndexedMesh } from "../AbstractMeshes/SimpleIndexedMesh.js";
import type { Engine } from "../../engine.js";
declare const engine: Engine;

const positions = new Float32Array([
    // Left face        //normals
    -1.0, 1.0, -1.0, 0.0, 1.0, 0.0,
    -1.0, 1.0, 1.0, 0.0, 1.0, 0.0,
    -1.0, -1.0, 1.0, 0.0, 1.0, 0.0,
    -1.0, -1.0, -1.0, 0.0, 1.0, 0.0,
    // Right face
    1.0, -1.0, 1.0, 0.0, 1.0, 0.0,
    1.0, 1.0, 1.0, 0.0, 1.0, 0.0,
    1.0, 1.0, -1.0, 0.0, 1.0, 0.0,
    1.0, -1.0, -1.0, 0.0, 1.0, 0.0,

    // Bottom face
    -1.0, -1.0, 1.0, 0.0, 1.0, 0.0,
    1.0, -1.0, 1.0, 0.0, 1.0, 0.0,
    1.0, -1.0, -1.0, 0.0, 1.0, 0.0,
    -1.0, -1.0, -1.0, 0.0, 1.0, 0.0,

    // Top face
    1.0, 1.0, -1.0, 0.0, 1.0, 0.0,
    1.0, 1.0, 1.0, 0.0, 1.0, 0.0,
    -1.0, 1.0, 1.0, 0.0, 1.0, 0.0,
    -1.0, 1.0, -1.0, 0.0, 1.0, 0.0,
    // Back face
    1.0, -1.0, -1.0, 0.0, 1.0, 0.0,
    1.0, 1.0, -1.0, 0.0, 1.0, 0.0,
    -1.0, 1.0, -1.0, 0.0, 1.0, 0.0,
    -1.0, -1.0, -1.0, 0.0, 1.0, 0.0,

    -1.0, 1.0, 1.0, 0.0, 1.0, 0.0,
    1.0, 1.0, 1.0, 0.0, 1.0, 0.0,
    1.0, -1.0, 1.0, 0.0, 1.0, 0.0,
    -1.0, -1.0, 1.0, 0.0, 1.0, 0.0,
])

let uid = 0;
export class Box extends SimpleIndexedMesh {
    override create_collider() {
        //TODO do not automaticly set collision events
        return engine.rust.create_cuboid_collider(this.scale_x, this.scale_y, this.scale_z, 0, true);
    }
    constructor(
        {
            scenes,
            point_light = 0,
            can_collide = false,
            label = 'box' + (uid++),
            color = [1, 0, 0, 0],
            fixed = false }:
            {
                scenes?: Scene[],
                point_light?: number,
                can_collide?: boolean,
                label?: string,
                color?: [number, number, number, number],
                fixed?: boolean
            }
    ) {
        super(
            {
                vertices: positions,
                can_collide
            },
            {
                label,
                point_light,
                scenes,
                fixed
            },
            Uint32Array.of(
                0, 1, 2, 0, 2, 3,    // front
                4, 5, 6, 4, 6, 7,    // back
                8, 9, 10, 8, 10, 11,   // top
                12, 13, 14, 12, 14, 15,   // bottom
                16, 17, 18, 16, 18, 19,   // right
                20, 21, 22, 20, 22, 23,   // left
            ));
        this.color = color;
    }
}