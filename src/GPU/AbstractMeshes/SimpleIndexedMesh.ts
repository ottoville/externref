import { BoundableNodeIndexed } from '../../nodes/BoundableNodeIndexed.js';
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
    createRenderPipeline: RenderPipelineProps0<
      typeof vertexShaderBuilder,
      typeof fragmentShaderBuilder
    >,
    vertexShaderBuilder: VertexShaderBuilder<{
      [index: string]: VertexShaderFunction;
    }>,
    fragmentShaderBuilder: FragmentShaderBuilder<{
      [index: string]: FragmentShaderFunction;
    }>,
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
    super(dataNodeProps, mainNodeProps);
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

        const vertices_view = engine.rust.vertices_pointer(
          dataNodeProps.vertices,
        );
        const vertices_len = this.vertices_count * this.vertices_stride;
        // Add storage bit in order to pull vertices for debugging normals
        if ((globals.env as string) === 'debug') {
          usages |= BufferUsageEnums.STORAGE;
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
      if (topology === 'triangle-strip' || topology === 'line-strip') {
        var renderPipeline = engine.gpu.createRenderPipelineBuilder(
          {
            desc: {
              ...createRenderPipeline,
              primitive: {
                frontFace: dataNodeProps.frontFace ?? 'cw',
                topology,
              },
            },
            fragmentShaderBuilder: fragmentShaderBuilder,
            vertexShaderBuilder: vertexShaderBuilder,
          },
          'uint32',
        );
      } else {
        var renderPipeline = engine.gpu.createRenderPipelineBuilder({
          desc: {
            ...createRenderPipeline,
            primitive: {
              frontFace: dataNodeProps.frontFace ?? 'cw',
              topology,
            },
          },
          fragmentShaderBuilder: fragmentShaderBuilder,
          vertexShaderBuilder: vertexShaderBuilder,
        });
      }

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
