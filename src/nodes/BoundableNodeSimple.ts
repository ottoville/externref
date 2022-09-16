import type { Scene } from "../Scene.js";
import { DataNode } from "./DataNode.js";

export abstract class BoundableNodeSimple extends DataNode {
    constructor(
        vertices:Float32Array,
        verticesPositionStride = 3,
        strip = false,
        label:string,
        can_collide: boolean,
        scenes?: Scene[],
        fixed = false,
        rigid_body = true,
        point_light = 0,
    ) {
        super(vertices, verticesPositionStride, can_collide, strip,point_light, undefined, label, scenes,undefined, fixed, rigid_body);
    }
    override set_vertices(vertices:Float32Array) {
        super.set_vertices(vertices);
        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes() {
        if(!this.initCollider())
            return;
        this.colliderVerticesV4.forEach(this.pushVertice);
        this.buildFaces();
    }
}