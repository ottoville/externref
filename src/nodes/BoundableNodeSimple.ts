import type { rust_vec_ptr } from "../engine.js";
import { type canCollideCharacter, DataNode, DataNodeProps } from "./DataNode.js";

export abstract class BoundableNodeSimple extends DataNode implements canCollideCharacter {
    constructor(
        dataNodeProps: DataNodeProps,
        mesh_id: number,
        strip = false,
    ) {
        super(
            dataNodeProps,
            mesh_id,
            strip);
    }
    override set_vertices(vec: rust_vec_ptr<"f32">) {
        super.set_vertices(vec);
        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes() {
        if (!this.initCollider())
            return;
        this.colliderVerticesV4.forEach(this.pushVertice);
        this.buildFaces();
    }
}