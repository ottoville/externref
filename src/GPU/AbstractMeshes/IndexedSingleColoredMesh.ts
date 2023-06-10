import type { rust_vec_ptr } from "../../engine.js";
import type { DataNodeProps } from "../../nodes/DataNode.js";
import { SimpleIndexedMesh, type SimpleIndexedMeshProps } from "./SimpleIndexedMesh.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
/**
 * Mesh where whole mesh is single colored
 */
export class IndexedSingleColoredMesh extends SimpleIndexedMesh {
    constructor(
        dataNodeProps: Omit<DataNodeProps, 'vertices'> & {vertices: {view: rust_vec_ptr<"f32">}},
        mesh_id: number,
        indicesView: rust_vec_ptr<"usize">,
        simpleIndexedMeshProps?: SimpleIndexedMeshProps
    ) {
        super(
            {
                ...dataNodeProps,
                vertices: {
                    view: dataNodeProps.vertices.view,
                    stride: 8
                }
            },
            mesh_id,
            indicesView,
            SimpleRenderPipeline,
            simpleIndexedMeshProps);
    }
}