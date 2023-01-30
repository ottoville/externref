import { BoundableNodeIndexed } from "../../nodes/BoundableNodeIndexed.js";
import { DrawableIndexed } from "../Drawables/DrawableIndexed.js";
import { Engine } from "../../engine.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
import { Buffer, IndexBuffer, VertexBuffer, GPUBufferUsage } from "../../GPU/Buffer/Buffer.js";
import type { SimpleVertShader } from "../Shaders/Simple.vert.js";
import type { RenderPipeline } from "../RenderPipeline2.js";
import type { DataNodeProps } from "../../nodes/DataNode.js";
import type { MainNodeProps } from "../../MainNode.js";
declare const engine: Engine;

export class SimpleIndexedMesh extends BoundableNodeIndexed {
    drawable: DrawableIndexed<RenderPipeline<SimpleVertShader>> | undefined;
    constructor(
        dataNodeProps: Omit<DataNodeProps, 'verticesPositionStride'>,
        mainNodeProps: Omit<MainNodeProps, 'strip'>,
        indicesView: Uint32Array,
        iBuffer?: IndexBuffer,
        vBufferGPU?: VertexBuffer,
        topology: GPUPrimitiveTopology = "triangle-list",
    ) {
        const strip = topology === 'triangle-strip' || topology === 'line-strip';
        super({
            ...dataNodeProps,
            verticesPositionStride: 6,
        }, {
            strip,
            ...mainNodeProps,
        }, indicesView);
        const primitiveState: GPUPrimitiveState = { frontFace: dataNodeProps.frontFace ?? 'cw', topology };
        if (strip)
            primitiveState.stripIndexFormat = 'uint32';
        if (engine.gpu) {
            if (!vBufferGPU) {
                vBufferGPU = Buffer.create(engine.gpu, dataNodeProps.vertices.byteLength, [GPUBufferUsage.VERTEX], 'SimpleIndexedMeshVertex_' + mainNodeProps.label, b => {
                    new Float32Array(b.getMappedRange()).set(dataNodeProps.vertices);
                });
            }
            const renderPipeline = engine.gpu.createRenderPipeline(SimpleRenderPipeline, primitiveState);

            this.drawable = new DrawableIndexed(
                {
                    renderPipeline,
                    renderPasses: new Set([engine.gpu.renderPassScreen, engine.gpu.pickRenderPass, engine.gpu.renderPassWater]),
                    vertexBuffers: [vBufferGPU]
                },
                {
                    node: this,
                }
            )
            if (!iBuffer) {
                iBuffer = Buffer.create(engine.gpu, indicesView.byteLength, [GPUBufferUsage.INDEX], 'index_' + mainNodeProps.label, b => {
                    new Uint32Array(b.getMappedRange()).set(indicesView);
                })
            }
            this.drawable!.setIndexBuffer(iBuffer, undefined, undefined, indicesView.BYTES_PER_ELEMENT == 4 ? 'uint32' : 'uint16');
        }

    }
}