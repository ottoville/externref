import type { Scene } from "../../Scene.js";
import { SimpleIndexedMesh } from "../AbstractMeshes/SimpleIndexedMesh.js";
import type { Engine } from "../../engine.js";
declare const engine: Engine;

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
                vertices: new Float32Array(engine.rust.memory.buffer, engine.rust.get_box_vertices(), 144),
                can_collide,
            },
            {
                label,
                point_light,
                scenes,
                fixed,
            },
            new Uint32Array(engine.rust.memory.buffer, engine.rust.get_box_indices(), 36));
        this.color = color;
    }
}