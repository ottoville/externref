import { BoundableNodeSimple } from '../../nodes/BoundableNodeSimple.js';
import { DrawableSimple } from '../Drawables/DrawableSimple.js';
import type { Engine } from '../../engine.js';
import { SimpleRenderPipeline } from '../RenderPipeLines/SimpleRenderPipeline.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import {
  createSimpleVertShader,
  type SimpleVertShader,
} from '../Shaders/SingleColoredWithNormal.vert.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import type { MainNodeProps } from 'MainNode.js';
import {
  Buffer,
  BufferUsageEnums,
  type VERTEX_BUFFER,
} from '../../webgpu-ts/index.js';
import { createSimpleFragShader2 } from 'GPU/RenderPipeLines/ColoredRenderPipeline.js';
declare const engine: Engine;

export class SimpleMesh extends BoundableNodeSimple {
  override drawable:
    | DrawableSimple<RenderPipelineProps<SimpleVertShader>>
    | undefined = undefined;
  constructor(
    dataNodeProps: DataNodeProps,
    mainNodeProps: MainNodeProps,
    vBufferGPU?: Buffer<VERTEX_BUFFER>,
  ) {
    super(dataNodeProps, mainNodeProps);
    if (engine.gpu) {
      if (!vBufferGPU) {
        if (!dataNodeProps.vertices) {
          throw new Error('SimpleMesh without vertices is not yet supported');
        }
        const vertices_view = engine.rust.vertices_pointer(
          dataNodeProps.vertices,
        );
        const vertices_len = this.vertices_count * this.vertices_stride;

        vBufferGPU = new Buffer(
          {
            gpu: engine.gpu.device,
            label: 'SimpleMeshVertex_' + this.label,
            size: vertices_len * Float32Array.BYTES_PER_ELEMENT,
            usages: BufferUsageEnums.VERTEX,
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
      const renderPipeline = engine.gpu.createRenderPipelineBuilder(
        SimpleRenderPipeline,
        createSimpleVertShader,
        createSimpleFragShader2,
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
