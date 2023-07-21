import { BoundableNodeIndexed } from '../../nodes/BoundableNodeIndexed.js';
import { DrawableIndexed } from '../Drawables/DrawableIndexed.js';
import type { Engine, rust_vec_ptr } from '../../engine.js';
import type { SimpleVertShader } from '../Shaders/Simple.vert.js';
import type { RenderPipeline } from '../RenderPipeline.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import type { CreateRenderPipelineCB } from '../../GPU.js';
import { VertexBufferLayout2, VertexShader } from '../../GPU/Shaders/VertexShader.js';
import { VertexShaderFunction } from '../Shaders/ShaderFunction.js';
import { BGLayout } from '../BindGroupLayout.js';
import { Buffer2, BufferUsageEnums } from '../Buffer/Buffer2.js';
declare const engine: Engine;

export type SimpleIndexedMeshProps = {
    vBufferGPU?: Buffer2<BufferUsageEnums.VERTEX> | Buffer2<typeof BufferUsageEnums['VERTEX|COPY_DST']>,
    topology?: GPUPrimitiveTopology,
    staticVertices?: boolean
};
export class SimpleIndexedMesh extends BoundableNodeIndexed {
    drawable: DrawableIndexed<RenderPipeline<SimpleVertShader>> | undefined;
    constructor(
        dataNodeProps: DataNodeProps,
        mesh_id: number,
        indicesView: rust_vec_ptr<'usize'>,
        createRenderPipeline: CreateRenderPipelineCB<RenderPipeline<VertexShader<readonly BGLayout[], { main: VertexShaderFunction<readonly BGLayout[], readonly [VertexBufferLayout2]> }>>>,
        { vBufferGPU, topology = 'triangle-list', staticVertices = true, }: SimpleIndexedMeshProps = {
            staticVertices: true, topology: 'triangle-list',
        }
    ) {
        const strip = topology === 'triangle-strip' || topology === 'line-strip';
        super(dataNodeProps,
            mesh_id,
            strip,
            indicesView);
        const primitiveState: GPUPrimitiveState = {
            frontFace: dataNodeProps.frontFace ?? 'cw',
            topology,
        };
        if (strip)
            primitiveState.stripIndexFormat = 'uint32';
        if (engine.gpu) {
            if (!vBufferGPU) {
                let usages: typeof BufferUsageEnums['VERTEX|COPY_DST'] | BufferUsageEnums.VERTEX;
                if (!staticVertices) {
                    usages = BufferUsageEnums['VERTEX|COPY_DST'];
                } else {
                    usages = BufferUsageEnums.VERTEX;
                }
                vBufferGPU = new Buffer2({
                    gpu: engine.gpu,
                    label: 'SimpleIndexedMeshVertex_' + this.label,
                    size: dataNodeProps.vertices.view[1] * Float32Array.BYTES_PER_ELEMENT,
                    usages: usages as BufferUsageEnums.VERTEX,
                },
                b => {
                    new Float32Array(b.getMappedRange()).set(new Float32Array(engine.rust.memory.buffer,
                        dataNodeProps.vertices.view[0],
                        dataNodeProps.vertices.view[1]));
                });
            }
            const renderPipeline = engine.gpu.createRenderPipeline(createRenderPipeline,
                primitiveState,
                {
                    stride: dataNodeProps.vertices.stride,
                });
            this.drawable = new DrawableIndexed(
                {
                    node: this,
                    renderPasses: new Set([
                        engine.gpu.renderPassScreen,
                        engine.gpu.pickRenderPass,
                        engine.gpu.renderPassWater
                    ]),
                    renderPipeline,
                    vertexBuffers: [
                        {
                            stride: 12,
                            view: vBufferGPU,
                        }
                    ],
                }
            );
        }
    }
}