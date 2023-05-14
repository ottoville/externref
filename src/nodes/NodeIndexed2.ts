import type { Engine, rust_pointer } from "../engine.js";
import { DrawableIndexed } from "../GPU/Drawables/DrawableIndexed.js";
import type { MainNode } from "MainNode.js";
import { allocate_vec } from "./DataNode.js";
declare const engine: Engine;
export type IndexedTrait = MainNode & {indexed: NodeIndexed2};
export class NodeIndexed2 {
    set_indices(vec: [ptr: rust_pointer<"usize">, len: number, cap: number], initial=false) {
        engine.rust.set_indices(this.node.id, ...vec);
        if (this.node.drawable && !(this.node.drawable instanceof DrawableIndexed)) {
            throw (new Error('Node is not indexed'));
        }
        this.node.drawable?.setIndexBuffer(new Uint32Array(engine.rust.memory.buffer, vec[0], vec[1]));
        if(!initial && this.onIndicesChange)
            this.onIndicesChange();
    }
    set_indices_and_vertices(indices: Uint32Array, vertices: Float32Array) {
        const [ptr_ind, len_ind, cap_ind] = allocate_vec(indices);
        const [ptr_vertices, len_vertices, cap_vertices] = allocate_vec(vertices);
        engine.rust.set_indices_and_vertices(this.node.id, ptr_ind, len_ind, cap_ind, ptr_vertices, len_vertices, cap_vertices);
        if (this.node.drawable && !(this.node.drawable instanceof DrawableIndexed)) {
            throw (new Error('Node is not indexed'));
        }
        this.node.drawable?.setIndexBuffer(indices);
        if(this.onIndicesChange)
            this.onIndicesChange();
    }
    get indices() {
        const [indices_len, indices_ptr] = new Uint32Array(engine.rust.memory.buffer, engine.rust.indices_field_pointer(this.node.id), 2);
        return new Uint32Array(engine.rust.memory.buffer, indices_ptr, indices_len);
    }
    get indices_count() {
        return new Uint32Array(engine.rust.memory.buffer, engine.rust.indices_field_pointer(this.node.id), 1)[0]!;
    }
    constructor(
        protected node: MainNode,
        indicesView: [ptr: rust_pointer<"usize">, len: number, cap: number],
        private onIndicesChange?: () => void
    ) {
        this.set_indices(indicesView, true);
    }
}