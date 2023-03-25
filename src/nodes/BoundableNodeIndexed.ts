import { type canCollideCharacter, DataNodeProps } from "./DataNode.js";
import type { MainNodeProps } from "../MainNode.js";
import { NodeIndexed } from "./NodeIndexed.js";

export abstract class BoundableNodeIndexed extends NodeIndexed implements canCollideCharacter {
    override set_indices_and_vertices(indices: Uint32Array, vertices: Float32Array) {
        super.set_indices_and_vertices(indices, vertices)
        this.rebuildTrianglePlanes();
    }
    override set_indices(indices: Uint32Array) {
        super.set_indices(indices)
        this.rebuildTrianglePlanes();
    }
    constructor(
        dataNodeProps: DataNodeProps,
        mainNodeProps: MainNodeProps,
        indicesView: Uint32Array
    ) {
        super(
            dataNodeProps,
            mainNodeProps, indicesView);
        this.rebuildTrianglePlanes();
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