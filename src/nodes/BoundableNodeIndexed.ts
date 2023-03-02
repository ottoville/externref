import { type canCollideCharacter, DataNode, DataNodeProps } from "./DataNode.js";
import type { Engine, rust_pointer } from "../engine.js";
import type { MainNodeProps } from "../MainNode.js";
declare const engine: Engine;

export abstract class BoundableNodeIndexed extends DataNode implements canCollideCharacter {
    indices_count?= 0;
    set_indices_and_vertices(indices: Uint32Array, vertices: Float32Array) {
        this.indices_count = indices.length;
        const ptr = engine.rust.alloc_vector_usize(indices.length);
        new Uint32Array(engine.rust.memory.buffer, ptr, indices.length).set(indices);

        const ptr_vertices = engine.rust.alloc_vector_f32(vertices.length);
        new Float32Array(engine.rust.memory.buffer, ptr_vertices, vertices.length).set(vertices);

        engine.rust.set_indices_and_vertices(this.ptr, ptr, indices.length, ptr_vertices, vertices.length);
        this.rebuildTrianglePlanes();
    }
    set_indices(indices: Uint32Array) {
        let ptr: rust_pointer<'usize'>
        this.indices_count = indices.length;
        if(indices.buffer !== engine.rust.memory.buffer) {
            ptr = engine.rust.alloc_vector_usize(indices.length);
            new Uint32Array(engine.rust.memory.buffer, ptr, indices.length).set(indices);
        } else {
            ptr = indices.byteOffset as rust_pointer<'usize'>;
        }
        engine.rust.set_indices(this.ptr, ptr, indices.length,);
        this.rebuildTrianglePlanes();
    }
    get indices() {
        const ptr = engine.rust.indices_pointer(this.ptr);
        return new Uint32Array(engine.rust.memory.buffer, ptr, this.indices_count ?? 0);
    }

    /*    set setFaces(faces:Float32Array) {
            this.faces=faces;
            this.rebuildTrianglePlanes();
        }*/
    constructor(
        dataNodeProps: DataNodeProps,
        mainNodeProps: MainNodeProps,
        indicesView: Uint32Array
    ) {
        super(
            dataNodeProps,
            mainNodeProps);
        this.set_indices(indicesView);
    }
    override set_vertices(vertices: Float32Array) {
        super.set_vertices(vertices);
        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes() {
        if (!this.initCollider())
            return;
        this.indices.forEach((indice: number) => {
            const position = this.colliderVerticesV4[indice]
            if (typeof (position) === 'undefined') {
                throw (new Error('position ' + indice + ' not found'));
            }
            this.pushVertice(position)
        });
        this.buildFaces();
    }
}