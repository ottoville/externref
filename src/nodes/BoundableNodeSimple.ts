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
    override set_vertices(vertices: Float32Array) {
        super.set_vertices(vertices);
        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes() {
        if (!this.initCollider())
            return;
        this.colliderVerticesV4.forEach(this.pushVertice);
        this.buildFaces();
    }
}