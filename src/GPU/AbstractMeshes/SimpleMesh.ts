import { BoundableNodeSimple } from '../../nodes/BoundableNodeSimple.js';
import { DrawableSimple } from '../Drawables/DrawableSimple.js';
import type { Engine, rust_vec_ptr } from '../../engine.js';
import { SimpleRenderPipeline } from '../RenderPipeLines/SimpleRenderPipeline.js';
import { Buffer, VertexBuffer, GPUBufferUsage } from '../Buffer/Buffer.js';
import type { RenderPipeline } from '../RenderPipeline.js';
import type { SimpleVertShader } from '../Shaders/Simple.vert.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';

declare const engine: Engine;

export class SimpleMesh extends BoundableNodeSimple {
    drawable: DrawableSimple<RenderPipeline<SimpleVertShader>> | undefined;
    constructor(
        dataNodeProps: Omit<DataNodeProps, 'vertices'> & { vertices: { view: rust_vec_ptr<'f32'> } },
        mesh_id: number,
        strip = false,
        vBufferGPU?: VertexBuffer) {
        super({
            ...dataNodeProps,
            vertices: {
                stride: 8,
                view: dataNodeProps.vertices.view,
            },
        },
        mesh_id,
        strip);
        if (engine.gpu) {
            if (!vBufferGPU) {
                vBufferGPU = Buffer.create(engine.gpu, dataNodeProps.vertices.view[1] * Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX], 'SimpleMeshVertex_' + this.label, b => {
                    new Float32Array(b.getMappedRange()).set(dataNodeProps.vertices.view);
                });
            }
            const renderPipeline = engine.gpu.createRenderPipeline(SimpleRenderPipeline, {}, { stride: 8, });
            this.drawable = new DrawableSimple({
                node: this,
                renderPasses: undefined,
                renderPipeline,
                vertexBuffers: [vBufferGPU],
            })
        }

    }
}