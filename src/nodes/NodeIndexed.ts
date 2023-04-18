import { allocate_vec, DataNode, DataNodeProps } from "./DataNode.js";
import type { Engine } from "../engine.js";
import type { DrawableIndexed } from "../GPU/Drawables/DrawableIndexed.js";
declare const engine: Engine;

export abstract class NodeIndexed extends DataNode {
    abstract override drawable?: DrawableIndexed | undefined;
    set_indices_and_vertices(indices: Uint32Array, vertices: Float32Array) {
        const ptr = allocate_vec(indices);
        const ptr_vertices = allocate_vec(vertices);
        engine.rust.set_indices_and_vertices(this.id, ptr, indices.length, ptr_vertices, vertices.length);
        this.drawable?.setIndexBuffer(indices);
    }
    set_indices(indices: Uint32Array) {
        const ptr = allocate_vec(indices);
        engine.rust.set_indices(this.id, ptr, indices.length);
        this.drawable?.setIndexBuffer(indices);
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
        indicesView: Uint32Array
    ) {
        const { byteOffset, length } = indicesView;
        super(
            dataNodeProps,
            mesh_id,
            strip);
        /*
            Reconstruct arraybufferView in case wasm have allocated more memory and old buffer is no longer valid.
        */
        if (indicesView.buffer.byteLength === 0) {
            indicesView = new Uint32Array(engine.rust.memory.buffer, byteOffset, length)
        }
        this.set_indices(indicesView);
    }
}
