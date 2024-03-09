import { BoundableNodeSimple } from '../../nodes/BoundableNodeSimple.js';
import { DrawableSimple } from '../Drawables/DrawableSimple.js';
import type { Engine } from '../../engine.js';
import { SimpleRenderPipeline } from '../RenderPipeLines/SimpleRenderPipeline.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import type { SimpleVertShader } from '../Shaders/SingleColoredWithNormal.vert.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import { MainNodeProps } from 'MainNode.js';
import {
  Buffer,
  BufferUsageEnums,
  type VERTEX_BUFFER,
} from '../../webgpu-ts/index.js';

declare const engine: Engine;

export class SimpleMesh extends BoundableNodeSimple {
  override drawable:
    | DrawableSimple<RenderPipelineProps<SimpleVertShader>>
    | undefined = undefined;
  constructor(
    dataNodeProps: Omit<DataNodeProps, 'vertices'> & {
      vertices: { view: rust_vec_ptr<'f32'> };
    },
    mainNodeProps: MainNodeProps,
    strip = false,
    vBufferGPU?: Buffer<VERTEX_BUFFER>,
  ) {
    super(
      {
        ...dataNodeProps,
        vertices: {
          stride: 8 as Word<'dword'>,
          view: dataNodeProps.vertices.view,
        },
      },
      mainNodeProps,
      strip,
    );
    if (engine.gpu) {
      if (!vBufferGPU) {
        vBufferGPU = new Buffer(
          {
            gpu: engine.gpu.device,
            label: 'SimpleMeshVertex_' + this.label,
            size:
              dataNodeProps.vertices.view[1] * Float32Array.BYTES_PER_ELEMENT,
            usages: BufferUsageEnums.VERTEX,
          },
          (b) => {
            new Float32Array(b.getMappedRange()).set(
              dataNodeProps.vertices.view,
            );
          },
        );
      }
      const renderPipeline = engine.gpu.createRenderPipeline(
        SimpleRenderPipeline,
        {},
        {
          stride: 8 as Word<'dword'>,
        },
      );
      this.drawable = new DrawableSimple({
        bindGroups: [],
        node: this,
        renderPipeline,
        vertexBuffers: [vBufferGPU],
      });
    }
  }
}
