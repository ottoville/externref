import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import { DrawableIndexed } from '../../Drawables/DrawableIndexed.js';
import { DebugLinesPipeline } from '../../RenderPipeLines/DebugLinesPipeline.js';
import {
  DataNode,
  allocate_vec_f32,
  allocate_vec_usize,
} from '../../../nodes/DataNode.js';
import type { Engine } from '../../../engine.js';
declare const engine: Engine;
// eslint-disable-next-line import/no-unused-modules
export function createWireFrameMesh(targetNode: DrawableDirect<DataNode>) {
  const indices_vec_ptr = allocate_vec_usize(targetNode.node.indices_count * 2);
  const [ind_ptr, ind_len] = indices_vec_ptr;
  const indices = new Uint32Array(engine.rust.memory.buffer, ind_ptr, ind_len);
  const targetIndices = targetNode.node.indices;
  for (let i = 0; i < targetIndices.length / 3; i++) {
    indices[i * 6] = targetIndices[i * 3]!;
    indices[i * 6 + 1] = targetIndices[i * 3 + 1]!;
    indices[i * 6 + 2] = targetIndices[i * 3 + 1]!;
    indices[i * 6 + 3] = targetIndices[i * 3 + 2]!;
    indices[i * 6 + 4] = targetIndices[i * 3 + 2]!;
    indices[i * 6 + 5] = targetIndices[i * 3]!;
  }
  let node: DataNode;

  const vertexBuffer = targetNode.vertexBuffers[0]?.buffer;
  const vertexBufferStride =
    targetNode.renderPipeline.builder.vertexShader.props.entryPoints['main']
      ?.vertexBufferLayout[0]?.arrayStride ?? targetNode.node.vertices_stride;
  const mainNodeProps = {
    label: 'Wireframe_' + targetNode.node.label,
    rigid_body: false,
  };

  const renderPipeline = engine.gpu!.createRenderPipeline(
    DebugLinesPipeline,
    {
      topology: 'line-list',
    },
    {
      stride: vertexBufferStride,
    },
  );

  if (vertexBuffer) {
    node = new DataNode(
      {
        can_collide: false,
        character_can_collide_to: false,
      },
      mainNodeProps,
      indices_vec_ptr,
    );
    node.drawable = new DrawableIndexed({
      bindGroups: [],
      node,
      renderPipeline,
      vertexBuffers: [vertexBuffer],
    });
  } else if (targetNode.node instanceof DataNode) {
    const stride = targetNode.node.vertices_stride;
    const vertices_ptr = allocate_vec_f32(targetNode.node.positions_count * 4);
    const newVertices = new Float32Array(
      engine.rust.memory.buffer,
      vertices_ptr[0],
      vertices_ptr[1],
    );
    targetNode.node.verticesArray.forEach((v, i) => {
      const slice = v.slice(0, stride);
      newVertices.set(slice, i * stride);
    });
    node = new DataNode(
      {
        can_collide: false,
        character_can_collide_to: false,
        vertices: {
          stride,
          view: vertices_ptr,
        },
      },
      mainNodeProps,
      indices_vec_ptr,
    );
    node.drawable = new DrawableIndexed({
      bindGroups: [],
      node,
      renderPipeline,
      vertexBuffers: [vertices_ptr],
    });
  } else {
    throw new Error(
      'Node has no vertexbuffer and no vertices data, cannot draw wireframe',
    );
  }

  const updateNode = () => {
    node.translation = targetNode.node.translation;
    node.update_scale(
      targetNode.node.scale_x + 0.1,
      targetNode.node.scale_y + 0.1,
      targetNode.node.scale_z + 0.1,
    );
    node.rotation = targetNode.node.rotation;
  };
  updateNode();

  //TODO: Share same transformation matrix instead of updating it from other
  targetNode.node.onMeshChange.add(updateNode);
}
