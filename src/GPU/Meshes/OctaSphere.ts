import type { Scene } from "../../Scene.js";
import { SimpleIndexedMesh } from "../AbstractMeshes/SimpleIndexedMesh.js";
import { new_rust_mesh } from "../../MainNode.js";
import type { Engine, rust_pointer } from "../../engine.js";
declare const engine: Engine;

export type OctaSphereProps = {
    width?: number,
    height?: number,
    depth?: number
}

let uid = 0;
export class OctaSphere extends SimpleIndexedMesh {
    protected width: number;
    protected height: number;
    protected depth: number;

    constructor(
        {
            width = 0,
            height = 0,
            depth = 0
        }: OctaSphereProps,
        label = 'OctaSphere' + (uid++),
        can_collide = false,
        fixed = false,
        scenes?: Scene[],
    ) {
        const ptrs = engine.rust.create_octasphere(2, width, height, depth);
        const [pos_ptr, pos_len, pos_cap, ind_ptr, ind_len, ind_cap] = new Uint32Array(engine.rust.memory.buffer, ptrs, 6)

        const mesh_id = new_rust_mesh({
            label,
            scenes,
            fixed
        });
        super(
            {
                vertices: {
                    view: [pos_ptr as rust_pointer<"f32">, pos_len! * 2 * 4, pos_cap! * 2 * 4] // Must do *2*4 because data is Vec<[Vec3F32; 2]> while expected type is Vec<f32>
                },
                can_collide,
                frontFace: 'ccw'
            },
            mesh_id,
            [ind_ptr as rust_pointer<"usize">, ind_len!, ind_cap!])

        this.width = width;
        this.height = height;
        this.depth = depth;

    }
}
