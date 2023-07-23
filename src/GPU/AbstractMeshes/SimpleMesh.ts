import { BoundableNodeSimple } from '../../nodes/BoundableNodeSimple.js';
import { DrawableSimple } from '../Drawables/DrawableSimple.js';
import type { Engine, rust_vec_ptr } from '../../engine.js';
import { SimpleRenderPipeline } from '../RenderPipeLines/SimpleRenderPipeline.js';
import type { RenderPipeline } from '../RenderPipeline.js';
import type { SimpleVertShader } from '../Shaders/Simple.vert.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import { Buffer2, BufferUsageEnums, type VERTEX_BUFFER } from '../Buffer/Buffer2.js';
import { MainNodeProps } from 'MainNode.js';

declare const engine: Engine;

export class SimpleMesh extends BoundableNodeSimple {
    override drawable: DrawableSimple<RenderPipeline<SimpleVertShader>> | undefined = undefined;
    constructor(
        dataNodeProps: Omit<DataNodeProps, 'vertices'> & { vertices: { view: rust_vec_ptr<'f32'> } },
        mainNodeProps: MainNodeProps,
        strip = false,
        vBufferGPU?: Buffer2<VERTEX_BUFFER>) {
        super({
            ...dataNodeProps,
            vertices: {
                stride: 8,
                view: dataNodeProps.vertices.view,
            },
        },
        mainNodeProps,
        strip);
        if (engine.gpu) {
            if (!vBufferGPU) {
                vBufferGPU = new Buffer2({
                    gpu: engine.gpu,
                    label: 'SimpleMeshVertex_' + this.label,
                    size: dataNodeProps.vertices.view[1] * Float32Array.BYTES_PER_ELEMENT,
                    usages: BufferUsageEnums.VERTEX,
                },
                b => {
                    new Float32Array(b.getMappedRange()).set(dataNodeProps.vertices.view);
                });
            }
            const renderPipeline = engine.gpu.createRenderPipeline(SimpleRenderPipeline,
                {
                },
                {
                    stride: 8,
                });
            this.drawable = new DrawableSimple({
                node: this,
                renderPasses: undefined,
                renderPipeline,
                vertexBuffers: [
                    {
                        stride: 8,
                        view: vBufferGPU,
                    }
                ],
            });
        }

    }
}