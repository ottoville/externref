import type { Scene } from "../../Scene.js";
import type { Engine, rust_pointer } from "../../engine.js";
import { new_rust_mesh } from "../../MainNode.js";
import { IndexedSingleColoredMesh } from "../AbstractMeshes/IndexedSingleColoredMesh.js";
declare const engine: Engine;

let uid = 0;
export class Box extends IndexedSingleColoredMesh {
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
        const mesh_id = new_rust_mesh({
            label,
            point_light,
            scenes,
            fixed,
        })
        const boxVertices = engine.rust.get_box_vertices();
        const [ptr_vertices, len_vertices, cap_vertices] = new Uint32Array(engine.rust.memory.buffer, boxVertices, 3);
        const boxIndices = engine.rust.get_box_indices();
        const [ptr_ind, len_ind, cap_ind] = new Uint32Array(engine.rust.memory.buffer, boxIndices, 3)

        super(
            {
                vertices: {
                    view: [ptr_vertices as rust_pointer<"f32">, len_vertices!, cap_vertices!]
                },
                can_collide,
            },
            mesh_id,
            [ptr_ind as rust_pointer<"usize">, len_ind!, cap_ind!]);
        this.color = color;
    }
}