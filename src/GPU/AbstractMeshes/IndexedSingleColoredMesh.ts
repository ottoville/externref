import type { rust_vec_ptr } from "../../engine.js";
import type { DataNodeProps } from "../../nodes/DataNode.js";
import { SimpleIndexedMesh, type SimpleIndexedMeshProps } from "./SimpleIndexedMesh.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/SimpleRenderPipeline.js";
/**
 * Mesh where whole mesh is single colored
 */
export class IndexedSingleColoredMesh extends SimpleIndexedMesh {
    constructor(
        dataNodeProps: DataNodeProps,
        mesh_id: number,
        indicesView: rust_vec_ptr<"usize">,
        simpleIndexedMeshProps?: SimpleIndexedMeshProps
    ) {
        super(
            dataNodeProps,
            mesh_id,
            indicesView,
            SimpleRenderPipeline,
            simpleIndexedMeshProps);
    }
}