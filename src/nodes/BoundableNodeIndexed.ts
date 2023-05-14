import { rust_pointer } from "engine.js";
import { type canCollideCharacter, DataNodeProps, DataNode } from "./DataNode.js";
import { IndexedTrait, NodeIndexed2 } from "./NodeIndexed2.js";

export abstract class BoundableNodeIndexed extends DataNode implements canCollideCharacter, IndexedTrait {
    indexed: NodeIndexed2;
    constructor(
        dataNodeProps: DataNodeProps,
        mesh_id: number,
        strip = false,
        indicesView: [ptr: rust_pointer<"usize">, len: number, cap: number],
        onIndicesChange?: () => void
    ) {
        super(
            dataNodeProps,
            mesh_id,
            strip);
        this.indexed = new NodeIndexed2(this, indicesView, () => {
            if(onIndicesChange)
                onIndicesChange();
            this.rebuildTrianglePlanes()
        });
        this.rebuildTrianglePlanes();
    }
    override set_vertices(vertices:  [ptr: rust_pointer<"f32">, len: number, cap: number]) {
        super.set_vertices(vertices);
        this.rebuildTrianglePlanes();
    }
    rebuildTrianglePlanes() {
        if (!this.initCollider() || !this.indexed /* This function is called from super constructor when indices are not initialized yet */)
            return;
        this.indexed.indices.forEach((indice: number) => {
            const position = this.colliderVerticesV4[indice]
            if (typeof (position) === 'undefined') {
                throw (new Error('position ' + indice + ' not found'));
            }
            this.pushVertice(position)
        });
        this.buildFaces();
    }
}