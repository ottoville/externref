import { BoundableNodeIndexed } from '../../nodes/BoundableNodeIndexed.js';
import { DrawableIndexed } from '../Drawables/DrawableIndexed.js';
import type { Engine, rust_vec_ptr } from '../../engine.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import { type CreateRenderPipelineCB } from '../../GPU.js';
import {
  type AnyVertexStage,
  type BindGroupLayoutEntry,
  type VertexBufferLayout2,
  type VertexShader,
  type VertexShaderFunction,
  Buffer,
  BufferUsageEnums,
} from '../../webgpu-ts/index.js';
import { MainNodeProps } from 'MainNode.js';
declare const engine: Engine;

export type SimpleIndexedMeshProps = {
  vBufferGPU?:
    | Buffer<BufferUsageEnums.VERTEX>
    | Buffer<(typeof BufferUsageEnums)['VERTEX|COPY_DST']>;
  topology?: GPUPrimitiveTopology;
  staticVertices?: boolean;
};
export class SimpleIndexedMesh extends BoundableNodeIndexed {
  constructor(
    dataNodeProps: DataNodeProps,
    mainNodeProps: MainNodeProps,
    indicesView: rust_vec_ptr<'usize'>,
    createRenderPipeline: CreateRenderPipelineCB<
      RenderPipelineProps<
        VertexShader<{
          main: VertexShaderFunction<
            readonly {
              [index: string]: BindGroupLayoutEntry<AnyVertexStage>;
            }[],
            readonly [VertexBufferLayout2]
          >;
        }>
      >
    >,
    {
      vBufferGPU,
      topology = 'triangle-list',
      staticVertices = true,
    }: SimpleIndexedMeshProps = {
      staticVertices: true,
      topology: 'triangle-list',
    },
  ) {
    if (!dataNodeProps.vertices) {
      throw new Error(
        'SimpleIndexedMesh without vertices is not yet supported',
      );
    }
    const strip = topology === 'triangle-strip' || topology === 'line-strip';
    super(dataNodeProps, mainNodeProps, strip, indicesView);
    const primitiveState: GPUPrimitiveState = {
      frontFace: dataNodeProps.frontFace ?? 'cw',
      topology,
    };
    if (strip) primitiveState.stripIndexFormat = 'uint32';
    if (engine.gpu) {
      if (!vBufferGPU) {
        let usages:
          | (typeof BufferUsageEnums)['VERTEX|COPY_DST']
          | BufferUsageEnums.VERTEX;
        if (!staticVertices) {
          usages = BufferUsageEnums['VERTEX|COPY_DST'];
        } else {
          usages = BufferUsageEnums.VERTEX;
        }

        let vertices_view: rust_pointer<'f32'>;
        let vertices_len: number;
        if (typeof dataNodeProps.vertices === 'number') {
          vertices_view = engine.rust.vertices_pointer(dataNodeProps.vertices);
          vertices_len =
            this.vertices_count * engine.rust.vertices_stride(this.id);
        } else {
          [vertices_view, vertices_len] = dataNodeProps.vertices.view;
        }
        vBufferGPU = new Buffer(
          {
            gpu: engine.gpu.device,
            label: 'SimpleIndexedMeshVertex_' + this.label,
            size: vertices_len * Float32Array.BYTES_PER_ELEMENT,
            usages: usages as BufferUsageEnums.VERTEX,
          },
          (b) => {
            new Float32Array(b.getMappedRange()).set(
              new Float32Array(
                engine.rust.memory.buffer,
                vertices_view,
                vertices_len,
              ),
            );
          },
        );
      }
      const renderPipeline = engine.gpu.createRenderPipeline(
        createRenderPipeline,
        primitiveState,
        {
          stride: engine.rust.vertices_stride(this.id),
        },
      );
      this.drawable = new DrawableIndexed({
        bindGroups: [],
        node: this,
        renderPasses: new Set([
          engine.gpu.renderPassScreen,
          engine.gpu.pickRenderPass,
          engine.gpu.renderPassWater,
        ]),
        renderPipeline,
        vertexBuffers: [vBufferGPU],
      });
    }
  }
}
