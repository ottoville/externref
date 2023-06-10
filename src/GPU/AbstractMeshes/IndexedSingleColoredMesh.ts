import type { rust_pointer } from "../../engine.js";
import type { VertexBuffer, CopyDstBuffer } from "../../GPU/Buffer/Buffer.js";
import type { DataNodeProps } from "../../nodes/DataNode.js";
import { SimpleIndexedMesh } from "./SimpleIndexedMesh.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
/**
 * Mesh where whole mesh is single colored
 */
export class IndexedSingleColoredMesh extends SimpleIndexedMesh {
    constructor(
        dataNodeProps: Omit<DataNodeProps, 'vertices'> & {vertices: {view: [ptr: rust_pointer<"f32">, len: number, cap: number]}},
        mesh_id: number,
        indicesView: [ptr: rust_pointer<"usize">, len: number, cap: number],
        vBufferGPU?: VertexBuffer | (CopyDstBuffer & VertexBuffer),
        topology: GPUPrimitiveTopology = "triangle-list",
        staticVertices = true
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
            vBufferGPU,
            topology,
            staticVertices);
    }
}