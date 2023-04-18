import { BoundableNodeIndexed } from "../../nodes/BoundableNodeIndexed.js";
import { DrawableIndexed } from "../Drawables/DrawableIndexed.js";
import { Engine } from "../../engine.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
import { Buffer, VertexBuffer, GPUBufferUsage, CopyDstBuffer } from "../../GPU/Buffer/Buffer.js";
import type { SimpleVertShader } from "../Shaders/Simple.vert.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import type { DataNodeProps } from "../../nodes/DataNode.js";
import type { MainNodeProps } from "../../MainNode.js";
declare const engine: Engine;

export class SimpleIndexedMesh extends BoundableNodeIndexed {
    drawable: DrawableIndexed<RenderPipeline<SimpleVertShader>> | undefined;
    constructor(
        dataNodeProps: Omit<DataNodeProps, 'vertices'> & {vertices: {view: Float32Array}},
        mainNodeProps: Omit<MainNodeProps, 'strip'>,
        indicesView: Uint32Array,
        private vBufferGPU?: VertexBuffer | (CopyDstBuffer & VertexBuffer),
        topology: GPUPrimitiveTopology = "triangle-list",
        staticVertices = true
    ) {
        const strip = topology === 'triangle-strip' || topology === 'line-strip';
        super({
            ...dataNodeProps,
            vertices: {
                view: dataNodeProps.vertices.view,
                stride: 8
            }
        }, {
            strip,
            ...mainNodeProps,
        }, indicesView);
        const primitiveState: GPUPrimitiveState = {
            frontFace: dataNodeProps.frontFace ?? 'cw',
            topology };
        if (strip)
            primitiveState.stripIndexFormat = 'uint32';
        if (engine.gpu) {
            if (!vBufferGPU) {
                if (!staticVertices) {
                    vBufferGPU = Buffer.create(engine.gpu, dataNodeProps.vertices.view.byteLength, [GPUBufferUsage.VERTEX, GPUBufferUsage.COPY_DST], 'SimpleIndexedMeshVertex_' + mainNodeProps.label, b => {
                        new Float32Array(b.getMappedRange()).set(dataNodeProps.vertices.view);
                    });
                } else {
                    vBufferGPU = Buffer.create(engine.gpu, dataNodeProps.vertices.view.byteLength, [GPUBufferUsage.VERTEX], 'SimpleIndexedMeshVertex_' + mainNodeProps.label, b => {
                        new Float32Array(b.getMappedRange()).set(dataNodeProps.vertices.view);
                    });
                }
                this.vBufferGPU = vBufferGPU;
            }
            const renderPipeline = engine.gpu.createRenderPipeline(SimpleRenderPipeline, primitiveState);

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
    updateVertices(
        bufferOffset: number,
        data: SharedArrayBuffer | BufferSource,
        dataOffset?: number | undefined,
        writeSize?: number | undefined,
        commandEncoder?: GPUCommandEncoder,) {
        if (!this.vBufferGPU) {
            throw new Error('vBufferGPU missing');
        }
        if ('write' in this.vBufferGPU) {
            if (commandEncoder) {
                this.vBufferGPU.updateBufferRaw(commandEncoder, data)
            } else {
                this.vBufferGPU.write(bufferOffset, data, dataOffset, writeSize)
            }
        } else {
            throw new Error('Cant update SimpleIndexedMesh vertices when they are set static')
        }
    }
}