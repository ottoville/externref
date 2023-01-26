import { BoundableNodeIndexed } from "../../nodes/BoundableNodeIndexed.js";
import type { Scene } from "../../Scene.js";
import { DrawableIndexed } from "../Drawables/DrawableIndexed.js";
import { Engine } from "../../engine.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
import { Buffer, IndexBuffer, VertexBuffer, GPUBufferUsage } from "../../GPU/Buffer/Buffer.js";
import type { SimpleVertShader } from "../Shaders/Simple.vert.js";
import type { RenderPipeline } from "../RenderPipeline2.js";
declare const engine: Engine;

export abstract class SimpleIndexedMesh extends BoundableNodeIndexed {
    drawable: DrawableIndexed<RenderPipeline<SimpleVertShader>> | undefined;
    constructor(
        vBufferCPU: Float32Array,
        indicesView: Uint32Array,
        label: string,
        iBuffer?: IndexBuffer,
        vBufferGPU?: VertexBuffer,
        point_light = 0,
        can_collide = false,
        scenes?: Scene[],
        frontFace: GPUFrontFace = 'cw',
        topology: GPUPrimitiveTopology = "triangle-list",
        fixed = false
    ) {
        const strip = topology === 'triangle-strip' || topology === 'line-strip';
        super(vBufferCPU, 6, indicesView, can_collide, strip, point_light, undefined, label, scenes, frontFace, fixed);
        const primitiveState: GPUPrimitiveState = { frontFace, topology };
        if (strip)
            primitiveState.stripIndexFormat = 'uint32';
        if (engine.gpu) {
            if (!vBufferGPU) {
                vBufferGPU = Buffer.create(engine.gpu, vBufferCPU.byteLength, [GPUBufferUsage.VERTEX], 'SimpleIndexedMeshVertex_' + label, b => {
                    new Float32Array(b.getMappedRange()).set(vBufferCPU);
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
                iBuffer = Buffer.create(engine.gpu, indicesView.byteLength, [GPUBufferUsage.INDEX], 'index_' + label, b => {
                    new Uint32Array(b.getMappedRange()).set(indicesView);
                })
            }
            this.drawable!.setIndexBuffer(iBuffer, undefined, undefined, indicesView.BYTES_PER_ELEMENT == 4 ? 'uint32' : 'uint16');
        }

    }
}