import { DataNode } from '../../nodes/DataNode.js';
import { DrawableSimple } from '../Drawables/DrawableSimple.js';
import type { Engine } from '../../engine.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import { type SimpleVertShader } from '../Shaders/SingleColoredWithNormal.vert.js';
import type { DataNodeProps } from '../../nodes/DataNode.js';
import { RigidBody, type MainNodeProps } from 'MainNode.js';
import {
  Buffer,
  BufferUsageEnums,
  type VERTEX_BUFFER,
} from '../../webgpu-ts/index.js';
import { create_rust_label } from '../../utils.js';
declare const engine: Engine;

export class SimpleMesh extends DataNode {
  override drawable:
    | DrawableSimple<RenderPipelineProps<SimpleVertShader>>
    | undefined = undefined;
  constructor(
    dataNodeProps: DataNodeProps,
    mainNodeProps: MainNodeProps,
    vBufferGPU?: Buffer<VERTEX_BUFFER>,
  ) {
    const {
      point_light = 0,
      directional_light = 0,
      label,
      scenes,
      rigid_body = RigidBody.default,
      camera_can_collide_to: camera_can_collide_do,
    } = mainNodeProps;
    const sceneids = scenes
      ? scenes.reduce((acc, scene) => acc | scene.id, 0)
      : 1;
    const mesh = engine.rust.new_mesh_from_js(
      point_light,
      directional_light,
      sceneids,
      rigid_body,
      ...create_rust_label(label),
      camera_can_collide_do,
    );
    super(dataNodeProps, mesh);
    if (engine.gpu) {
      if (!vBufferGPU) {
        const vertices_view = engine.rust.vertices_pointer(
          this.geometry,
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
