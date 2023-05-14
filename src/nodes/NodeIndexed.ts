import { DataNode, DataNodeProps } from "./DataNode.js";
import type { rust_pointer } from "../engine.js";
import type { DrawableIndexed } from "../GPU/Drawables/DrawableIndexed.js";
import { NodeIndexed2 } from "./NodeIndexed2.js";

export abstract class NodeIndexed extends DataNode {
    indexed: NodeIndexed2;
    abstract override drawable?: DrawableIndexed | undefined;

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
        this.indexed = new NodeIndexed2(this, indicesView);
    }
}
