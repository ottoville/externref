import { rust_pointer } from "engine.js";
import { type canCollideCharacter, DataNodeProps } from "./DataNode.js";
import { NodeIndexed } from "./NodeIndexed.js";

export abstract class BoundableNodeIndexed extends NodeIndexed implements canCollideCharacter {
    override set_indices_and_vertices(indices: Uint32Array, vertices: Float32Array) {
        super.set_indices_and_vertices(indices, vertices)
        this.rebuildTrianglePlanes();
    }
    override set_indices(vec: [ptr: rust_pointer<"usize">, len: number, cap: number]) {
        super.set_indices(vec)
        this.rebuildTrianglePlanes();
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
            strip,
            indicesView);
        this.rebuildTrianglePlanes();
    }
    override set_vertices(vertices:  [ptr: rust_pointer<"f32">, len: number, cap: number]) {
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