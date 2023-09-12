import { BoundableNodeIndexed } from '../../nodes/BoundableNodeIndexed.js';
import { DrawableIndexed } from '../Drawables/DrawableIndexed.js';
import type { Engine, rust_vec_ptr } from '../../engine.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import { GPU, type CreateRenderPipelineCB } from '../../GPU.js';
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
        vBufferGPU = new Buffer(
          {
            gpu: engine.gpu.device,
            label: 'SimpleIndexedMeshVertex_' + this.label,
            size:
              dataNodeProps.vertices.view[1] * Float32Array.BYTES_PER_ELEMENT,
            usages: usages as BufferUsageEnums.VERTEX,
          },
          (b) => {
            new Float32Array(b.getMappedRange()).set(
              new Float32Array(
                engine.rust.memory.buffer,
                dataNodeProps.vertices!.view[0],
                dataNodeProps.vertices!.view[1],
              ),
            );
          },
        );
      }
      const renderPipeline = engine.gpu.createRenderPipeline(
        createRenderPipeline,
        primitiveState,
        {
          stride: dataNodeProps.vertices.stride,
        },
      );
      this.drawable = new DrawableIndexed({
        bindGroups: [
          {
            bindGroup: engine.gpu!.BindGroupPosition,
            offsets: [
              engine.rust.gpu_alignment(this.id) * GPU.gpu_memory_index_size,
            ],
          },
        ],
        node: this,
        renderPasses: new Set([
          engine.gpu.renderPassScreen,
          engine.gpu.pickRenderPass,
          engine.gpu.renderPassWater,
        ]),
        renderPipeline,
        vertexBuffers: [
          {
            stride: dataNodeProps.vertices.stride,
            view: vBufferGPU,
          },
        ],
      });
    }
  }
}
