import {
  createDebugNormalsVertShader2,
  NormalsPipeline,
} from '../../RenderPipeLines/NormalsPipeline.js';
import { DrawableSimple } from '../../Drawables/DrawableSimple.js';
import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import {
  DataNode,
  allocate_vec_positions_and_normals,
} from '../../../nodes/DataNode.js';
import type { Engine } from '../../../engine.js';
declare const engine: Engine;
import type { RenderPipelineProps } from 'GPU/RenderPipeline.js';
import { RigidBody } from 'MainNode.js';

// eslint-disable-next-line import/no-unused-modules
export class NormalsMesh extends DataNode {
  override drawable: DrawableSimple<RenderPipelineProps>;
  constructor(targetNode: DrawableDirect<DataNode>) {
    const stride = 8 as Word<'dword'>;
    const vertices_ptr = allocate_vec_positions_and_normals(
      (targetNode.node.positions_count * 2) as Word<'dword'>,
    );
    const updateVertices = () => {
      const newVertices = new Float32Array(
        engine.rust.memory.buffer,
        vertices_ptr[0],
        vertices_ptr[1] * stride,
      );
      const vertices = targetNode.node.verticesArray;
      vertices.forEach((v, i) => {
        const slice = v.slice(0, stride);
        newVertices.set(slice, i * stride * 2);
        newVertices.copyWithin(
          i * stride * 2 + stride,
          i * stride * 2,
          i * stride * 2 + stride,
        );
      });
    };
    updateVertices();
    targetNode.node.onVerticesChangeListeners.add(() => {
      updateVertices();
      this.drawable.setVertexBuffer(
        0,
        [vertices_ptr[0], vertices_ptr[1] * stride],
        true,
      );
    });
    const geometry = engine.rust.create_geometry(true, false, true, false);
    engine.rust.set_position_and_normal_vertices(
      geometry,
      ...vertices_ptr,
      stride,
    );
    super(
      {
        character_can_collide_to: false,
        vertices: geometry,
      },
      {
        label: 'NormalsDebug',
        rigid_body: RigidBody.off,
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
      {
        ...NormalsPipeline,
        primitive: {
          topology: 'line-list',
        },
      },
      createDebugNormalsVertShader2,
      engine.gpu!.shaders.ColorShader,
      {
        stride,
      },
    );
    this.drawable = new DrawableSimple({
      bindGroups: [],
      node: this,
      renderPipeline,
      vertexBuffers: [[vertices_ptr[0], vertices_ptr[1] * stride]],
    });
  }
}
