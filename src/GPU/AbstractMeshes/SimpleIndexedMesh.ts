import { DrawableIndexed } from '../Drawables/DrawableIndexed.js';
import type { Engine } from '../../engine.js';
import type { RenderPipelineProps0 } from '../RenderPipeline.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import {
  type VertexShaderFunction,
  Buffer,
  BufferUsageEnums,
  type FragmentShaderBuilder,
  type VertexShaderBuilder,
  FragmentShaderFunction,
} from '../../webgpu-ts/index.js';
import { GPU } from 'GPU.js';
import { IndexedDataNode } from '../../nodes/IndexedDataNode.js';
declare const engine: Engine;

export type SimpleIndexedMeshProps = {
  vBufferGPU?:
    | Buffer<BufferUsageEnums.VERTEX>
    | Buffer<(typeof BufferUsageEnums)['VERTEX|COPY_DST']>;
  topology?: GPUPrimitiveTopology;
  staticVertices?: boolean;
};
interface GPUProps<
  V extends VertexShaderBuilder<{
    [index: string]: VertexShaderFunction;
  }> = VertexShaderBuilder<{
    [index: string]: VertexShaderFunction;
  }>,
  F extends FragmentShaderBuilder<{
    [index: string]: FragmentShaderFunction;
  }> = FragmentShaderBuilder<{
    [index: string]: FragmentShaderFunction;
  }>,
> {
  gpu: GPU;
  createRenderPipeline: RenderPipelineProps0<V, F>;
  vertexShaderBuilder: V;
  fragmentShaderBuilder: F;
}
export class SimpleIndexedMesh extends IndexedDataNode {
  constructor(
    dataNodeProps: DataNodeProps,
    mesh_pointer: rust_pointer<'mesh_id'>,
    gpuProps?: GPUProps,
    {
      vBufferGPU,
      topology = 'triangle-list',
      staticVertices = true,
    }: SimpleIndexedMeshProps = {
      staticVertices: true,
      topology: 'triangle-list',
    },
  ) {
    super(dataNodeProps, mesh_pointer);
    if (gpuProps) {
      if (!vBufferGPU) {
        let usages:
          | (typeof BufferUsageEnums)['VERTEX|COPY_DST']
          | BufferUsageEnums.VERTEX;
        if (!staticVertices) {
          usages = BufferUsageEnums['VERTEX|COPY_DST'];
        } else {
          usages = BufferUsageEnums.VERTEX;
        }

        const vertices_view = engine.rust.vertices_pointer(
          this.geometry,
          false,
        );
        const vertices_len = this.vertices_count * this.vertices_stride;
        // Add storage bit in order to pull vertices for debugging normals
        if ((globals.env as string) === 'debug') {
          usages |= BufferUsageEnums.STORAGE;
        }
        const vBufferGPUMapped = new Buffer({
          gpu: gpuProps.gpu.device,
          label: 'SimpleIndexedMeshVertex_' + this.label,
          mappedAtCreation: true,
          size: vertices_len * Float32Array.BYTES_PER_ELEMENT,
          usages: usages as BufferUsageEnums.VERTEX,
        });
        new Float32Array(vBufferGPUMapped.getMappedRange()).set(
          new Float32Array(
            engine.rust.memory.buffer,
            vertices_view,
            vertices_len,
          ),
        );
        vBufferGPU = vBufferGPUMapped.unmap();
      }
      if (topology === 'triangle-strip' || topology === 'line-strip') {
        var renderPipeline = gpuProps.gpu.createRenderPipelineBuilder(
          {
            desc: {
              ...gpuProps.createRenderPipeline,
              primitive: {
                frontFace: dataNodeProps.frontFace ?? 'cw',
                topology,
              },
            },
            fragmentShaderBuilder: gpuProps.fragmentShaderBuilder,
            vertexShaderBuilder: gpuProps.vertexShaderBuilder,
          },
          'uint32',
        );
      } else {
        var renderPipeline = gpuProps.gpu.createRenderPipelineBuilder({
          desc: {
            ...gpuProps.createRenderPipeline,
            primitive: {
              frontFace: dataNodeProps.frontFace ?? 'cw',
              topology,
            },
          },
          fragmentShaderBuilder: gpuProps.fragmentShaderBuilder,
          vertexShaderBuilder: gpuProps.vertexShaderBuilder,
        });
      }

      this.drawable = new DrawableIndexed({
        bindGroups: [],
        node: this,
        renderPasses: new Set([
          gpuProps.gpu.renderPassScreen,
          gpuProps.gpu.pickRenderPass,
          gpuProps.gpu.renderPassWater,
        ]),
        renderPipeline,
        vertexBuffers: [vBufferGPU],
      });
    }
  }
}
