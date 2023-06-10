import type { rust_vec_ptr } from "../../engine.js";
import type { DataNodeProps } from "../../nodes/DataNode.js";
import { ColoredRenderPipeline } from "../RenderPipeLines/ColoredRenderPipeline.js";
import { SimpleIndexedMesh, type SimpleIndexedMeshProps } from "./SimpleIndexedMesh.js";
/**
 * Mesh where each vertex have a color value
 */
export class IndexedColoredMesh extends SimpleIndexedMesh {
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
            ColoredRenderPipeline,
            simpleIndexedMeshProps);
    }
}