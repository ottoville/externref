import { BoundableNodeSimple } from "../../nodes/BoundableNodeSimple.js";
import { DrawableSimple } from "../Drawables/DrawableSimple.js";
import { Engine } from "../../engine.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
import { Buffer, VertexBuffer, GPUBufferUsage } from "../Buffer/Buffer.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import type { SimpleVertShader } from "../Shaders/Simple.vert.js";
import type { MainNodeProps } from "../../MainNode.js";
import type { DataNodeProps } from "../../nodes/DataNode.js";

declare const engine: Engine;

export class SimpleMesh extends BoundableNodeSimple {
    drawable: DrawableSimple<RenderPipeline<SimpleVertShader>> | undefined;
    constructor(
        dataNodeProps: Omit<DataNodeProps, 'verticesPositionStride'>,
        mainNodeProps: Omit<MainNodeProps, "positionsCount">,
        vBufferGPU?: VertexBuffer) {
        super({
            ...dataNodeProps,
            verticesPositionStride: 6,
        }, mainNodeProps);
        if (engine.gpu) {
            if (!vBufferGPU) {
                vBufferGPU = Buffer.create(engine.gpu, dataNodeProps.vertices.byteLength, [GPUBufferUsage.VERTEX], 'SimpleMeshVertex_' + mainNodeProps.label, b => {
                    new Float32Array(b.getMappedRange()).set(dataNodeProps.vertices);
                });
            }
            const renderPipeline = engine.gpu.createRenderPipeline(SimpleRenderPipeline);
            this.drawable = new DrawableSimple({
                renderPipeline,
                vertexBuffers: [vBufferGPU],
                renderPasses: undefined,
                node: this,
            })
        }

    }
}