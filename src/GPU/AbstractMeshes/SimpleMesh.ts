import { BoundableNodeSimple } from '../../nodes/BoundableNodeSimple.js';
import { DrawableSimple } from '../Drawables/DrawableSimple.js';
import type { Engine } from '../../engine.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import { type SimpleVertShader } from '../Shaders/SingleColoredWithNormal.vert.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import type { MainNodeProps } from 'MainNode.js';
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
          false,
        );
        const vertices_len = this.vertices_count * this.vertices_stride;

        const vBufferGPUMapped = new Buffer({
          gpu: engine.gpu.device,
          label: 'SimpleMeshVertex_' + this.label,
          mappedAtCreation: true,
          size: vertices_len * Float32Array.BYTES_PER_ELEMENT,
          usages: BufferUsageEnums.VERTEX,
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
      const renderPipeline = engine.gpu.createRenderPipelineBuilder({
        desc: {
          connections: {
            main: 'main',
            pick: 'pick',
          },
        },
        fragmentShaderBuilder: engine.gpu.shaders.simpleFragShader,
        vertexShaderBuilder: engine.gpu!.shaders.simpleVertShader,
      });
      this.drawable = new DrawableSimple({
        bindGroups: [],
        node: this,
        renderPipeline,
        vertexBuffers: [vBufferGPU],
      });
    }
  }
}
