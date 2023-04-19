import { allocate_vec, DataNode, DataNodeProps } from "./DataNode.js";
import type { Engine, rust_pointer } from "../engine.js";
import type { DrawableIndexed } from "../GPU/Drawables/DrawableIndexed.js";
declare const engine: Engine;

export abstract class NodeIndexed extends DataNode {
    abstract override drawable?: DrawableIndexed | undefined;
    set_indices_and_vertices(indices: Uint32Array, vertices: Float32Array) {
        const [ptr_ind, len_ind, cap_ind] = allocate_vec(indices);
        const [ptr_vertices, len_vertices, cap_vertices] = allocate_vec(vertices);
        engine.rust.set_indices_and_vertices(this.id, ptr_ind, len_ind, cap_ind, ptr_vertices, len_vertices, cap_vertices);
        this.drawable?.setIndexBuffer(indices);
    }
    set_indices(vec: [ptr: rust_pointer<"usize">, len: number, cap: number]) {
        engine.rust.set_indices(this.id, ...vec);
        this.drawable?.setIndexBuffer(new Uint32Array(engine.rust.memory.buffer, vec[0], vec[1]));
    }
    get indices() {
        const [indices_len, indices_ptr] = new Uint32Array(engine.rust.memory.buffer, engine.rust.indices_field_pointer(this.id), 2);
        return new Uint32Array(engine.rust.memory.buffer, indices_ptr, indices_len);
    }
    get indices_count() {
        return new Uint32Array(engine.rust.memory.buffer, engine.rust.indices_field_pointer(this.id), 1)[0]!;
    }
    constructor(
        dataNodeProps: DataNodeProps,
        mesh_id: number,
        strip = false,
        indicesView: [ptr: rust_pointer<"usize">, len: number, cap: number]
    ) {
        super(
            dataNodeProps,
            mesh_id,
            strip);
        this.set_indices(indicesView);
    }
}
