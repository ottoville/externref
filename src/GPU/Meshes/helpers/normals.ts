import { NormalsPipeline } from '../../RenderPipeLines/NormalsPipeline.js';
import { DrawableSimple } from '../../Drawables/DrawableSimple.js';
import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import { DataNode, allocate_vec_f32 } from '../../../nodes/DataNode.js';
import type { Engine } from '../../../engine.js';
declare const engine: Engine;
import type { RenderPipelineProps } from 'GPU/RenderPipeline.js';
import { gpu_memory_index_size } from '../../../GPU/Shaders/ShaderBuilders.js';

// eslint-disable-next-line import/no-unused-modules
export class NormalsMesh extends DataNode {
  override drawable: DrawableSimple<RenderPipelineProps>;
  constructor(targetNode: DrawableDirect<DataNode>) {
    //const gpu = targetNode.renderPipeline.props.vertexShader.props.gpu;
    const stride = 16; // 8*2;
    const vertices_ptr = allocate_vec_f32(
      targetNode.node.positions_count * stride,
    );
    const updateVertices = () => {
      const newVertices = new Float32Array(
        engine.rust.memory.buffer,
        vertices_ptr[0],
        vertices_ptr[1],
      );
      const vertices = targetNode.node.verticesArray;
      vertices.forEach((v, i) => {
        const slice = v.slice(0, 8);
        newVertices.set(slice, i * stride);
        newVertices.copyWithin(i * stride + 8, i * stride, i * stride + 8);
      });
    };
    updateVertices();
    targetNode.node.onVerticesChangeListeners.push(() => {
      updateVertices();
      this.drawable.setVertexBuffer(0, vertices_ptr, true);
    });
    super(
      {
        character_can_collide_to: false,
        vertices: {
          stride: 8,
          view: vertices_ptr,
        },
      },
      {
        label: 'NormalsDebug',
        rigid_body: false,
      },
    );

    this.translation = targetNode.node.translation;
    this.update_scale(
      targetNode.node.scale_x,
      targetNode.node.scale_y,
      targetNode.node.scale_z,
    );
    this.rotation = targetNode.node.rotation;
    //TODO: Share same transformation matrix instead of updating it from other
    targetNode.node.onMeshChange.add(() => {
      this.translation = targetNode.node.translation;
      this.update_scale(
        targetNode.node.scale_x,
        targetNode.node.scale_y,
        targetNode.node.scale_z,
      );
      this.rotation = targetNode.node.rotation;
    });
    const renderPipeline = engine.gpu!.createRenderPipeline(
      NormalsPipeline,
      {
        topology: 'line-list',
      },
      {
        stride: 8,
      },
    );
    this.drawable = new DrawableSimple({
      bindGroups: [
        {
          bindGroup: engine.gpu!.BindGroupPosition,
          offsets: [engine.rust.gpu_alignment(this.id) * gpu_memory_index_size],
        },
      ],
      node: this,
      renderPipeline,
      vertexBuffers: [vertices_ptr],
    });
  }
}
