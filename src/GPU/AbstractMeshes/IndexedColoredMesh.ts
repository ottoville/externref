import type { rust_pointer } from "../../engine.js";
import type { VertexBuffer, CopyDstBuffer } from "../Buffer/Buffer.js";
import type { DataNodeProps } from "../../nodes/DataNode.js";
import { ColoredRenderPipeline } from "../RenderPipeLines/ColoredRenderPipeline.js";
import { SimpleIndexedMesh } from "./SimpleIndexedMesh.js";
/**
 * Mesh where each vertex have a color value
 */
export class IndexedColoredMesh extends SimpleIndexedMesh {
    constructor(
        dataNodeProps: Omit<DataNodeProps, 'vertices'> & {vertices: {view: [ptr: rust_pointer<"f32">, len: number, cap: number]}},
        mesh_id: number,
        indicesView: [ptr: rust_pointer<"usize">, len: number, cap: number],
        vBufferGPU?: VertexBuffer | (CopyDstBuffer & VertexBuffer),
        topology: GPUPrimitiveTopology = "triangle-list",
        staticVertices = true
    ) {
        super({
            ...dataNodeProps,
            vertices: {
                view: dataNodeProps.vertices.view,
                stride: 12
            }
        },
        mesh_id,
        indicesView,
        ColoredRenderPipeline,
        vBufferGPU,
        topology,
        staticVertices
        );
    }
}