import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import { DrawableIndexed } from '../../Drawables/DrawableIndexed.js';
import { DebugLinesPipeline } from '../../RenderPipeLines/DebugLinesPipeline.js';
import type { Engine } from '../../../engine.js';
import { create_rust_label } from '../../../MainNode.js';
import { createDebugBoundingBoxVertShader } from '../../Shaders/devtools/debug_boundingbox.vert.js';
import { IndexedDataNode } from '../../../nodes/IndexedDataNode.js';
declare const engine: Engine;
export function createWireFrameMesh(
  targetNode: DrawableDirect<IndexedDataNode>,
) {
  const gpuVertexBuffer = targetNode.vertexBuffers[0]?.buffer;
  if (gpuVertexBuffer) {
    const vertexBufferStrideBytes =
      targetNode.renderPipeline.builder.vertexShader.props.entryPoints['main']
        ?.vertexBufferLayout[0]?.arrayStride ??
      targetNode.node.vertices_stride * 4;

    const renderPipeline = engine.gpu!.createRenderPipelineBuilder(
      {
        ...DebugLinesPipeline,
        primitive: {
          topology: 'line-list',
        },
      },
      createDebugBoundingBoxVertShader,
      engine.gpu!.shaders.ColorShader,
      {
        stride: (vertexBufferStrideBytes / 4) as Word<'dword'>,
      },
    );
    const mesh = engine.rust.create_debug_mesh_wireframe(
      targetNode.node.id,
      ...create_rust_label('wireframe_' + targetNode.node.label),
    );
    const node = new IndexedDataNode(
      {
        can_collide: false,
        character_can_collide_to: false,
        vertices: engine.rust.get_geometry(mesh),
      },
      mesh,
    );
    node.drawable = new DrawableIndexed({
      bindGroups: [],
      node,
      renderPipeline,
      vertexBuffers: [gpuVertexBuffer],
    });
    targetNode.onVertexBufferChange.push((index) => {
      node.drawable?.setVertexBuffer(
        index,
        targetNode.vertexBuffers[0]!.buffer,
        false,
      );
    });
  } else {
    throw new Error('Node has no vertexbuffer, cannot draw wireframe');
  }
}
