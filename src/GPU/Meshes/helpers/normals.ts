import { NormalsPipeline } from '../../RenderPipeLines/NormalsPipeline.js';
import { DrawableSimple } from '../../Drawables/DrawableSimple.js';
import type { RenderPipeline } from '../../RenderPipeline.js';
import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import { DataNode, allocate_vec_f32 } from '../../../nodes/DataNode.js';
import type { Engine } from '../../../engine.js';
declare const engine: Engine;

export class NormalsMesh extends DataNode {
  override drawable: DrawableSimple<RenderPipeline>;
  constructor(targetNode: DrawableDirect<DataNode>) {
    const gpu =
      targetNode.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu;
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
      this.drawable.setVertexBuffer(
        0,
        {
          stride,
          view: vertices_ptr,
        },
        true,
      );
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
    const renderPipeline = gpu.createRenderPipeline(
      NormalsPipeline,
      {
        topology: 'line-list',
      },
      {
        stride: 8,
      },
    );
    this.drawable = new DrawableSimple({
      node: this,
      renderPasses: undefined,
      renderPipeline,
      vertexBuffers: [
        {
          stride,
          view: vertices_ptr,
        },
      ],
    });
  }
}
