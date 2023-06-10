import { BoundableNodeIndexed } from "../../nodes/BoundableNodeIndexed.js";
import { DrawableIndexed } from "../Drawables/DrawableIndexed.js";
import { Engine, rust_pointer } from "../../engine.js";
import { Buffer, VertexBuffer, GPUBufferUsage, CopyDstBuffer } from "../../GPU/Buffer/Buffer.js";
import type { SimpleVertShader } from "../Shaders/Simple.vert.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import type { DataNodeProps } from "../../nodes/DataNode.js";
import type { CreateRenderPipelineCB } from "../../GPU.js";
import { VertexShader } from "../../GPU/Shaders/VertexShader.js";
import { PipelineLayout } from "../../GPU/PipelineLayout.js";
declare const engine: Engine;

export class SimpleIndexedMesh extends BoundableNodeIndexed {
    drawable: DrawableIndexed<RenderPipeline<SimpleVertShader>> | undefined;
    constructor(
        dataNodeProps: DataNodeProps,
        mesh_id: number,
        indicesView: [ptr: rust_pointer<"usize">, len: number, cap: number],
        createRenderPipeline: CreateRenderPipelineCB<RenderPipeline<VertexShader<{ [index: string]: PipelineLayout }, [GPUVertexBufferLayout]>>>,
        vBufferGPU?: VertexBuffer | (CopyDstBuffer & VertexBuffer),
        topology: GPUPrimitiveTopology = "triangle-list",
        staticVertices = true
    ) {
        const strip = topology === 'triangle-strip' || topology === 'line-strip';
        super(dataNodeProps,
            mesh_id,
            strip,
            indicesView);
        const primitiveState: GPUPrimitiveState = {
            frontFace: dataNodeProps.frontFace ?? 'cw',
            topology
        };
        if (strip)
            primitiveState.stripIndexFormat = 'uint32';
        if (engine.gpu) {
            if (!vBufferGPU) {
                if (!staticVertices) {
                    vBufferGPU = Buffer.create(engine.gpu, dataNodeProps.vertices.view[1] * Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST], 'SimpleIndexedMeshVertex_' + this.label, b => {
                        new Float32Array(b.getMappedRange()).set(new Float32Array(engine.rust.memory.buffer, dataNodeProps.vertices.view[0], dataNodeProps.vertices.view[1]));
                    });
                } else {
                    vBufferGPU = Buffer.create(engine.gpu, dataNodeProps.vertices.view[1] * Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX], 'SimpleIndexedMeshVertex_' + this.label, b => {
                        new Float32Array(b.getMappedRange()).set(new Float32Array(engine.rust.memory.buffer, dataNodeProps.vertices.view[0], dataNodeProps.vertices.view[1]));
                    });
                }
            }
            const renderPipeline = engine.gpu.createRenderPipeline(createRenderPipeline, primitiveState, { stride: dataNodeProps.vertices.stride });

            this.drawable = new DrawableIndexed(
                {
                    renderPipeline,
                    renderPasses: new Set([engine.gpu.renderPassScreen, engine.gpu.pickRenderPass, engine.gpu.renderPassWater]),
                    vertexBuffers: [vBufferGPU],
                    node: this,
                }
            )
        }
    }
}