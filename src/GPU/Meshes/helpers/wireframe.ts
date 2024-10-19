import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import { DrawableIndexed } from '../../Drawables/DrawableIndexed.js';
import type { Engine } from '../../../engine.js';
import { create_rust_label } from '../../../MainNode.js';
import { createDebugBoundingBoxVertShader } from '../../Shaders/devtools/debug_boundingbox.vert.js';
import { IndexedDataNode } from '../../../nodes/IndexedDataNode.js';
import {
  Struct,
  StructProperty,
  VertexBufferLayouts,
} from 'webgpu-ts/index.js';
declare const engine: Engine;
export function createWireFrameMesh(
  targetNode: DrawableDirect<IndexedDataNode>,
) {
  const buffer = targetNode.renderPipeline.builder.vertexShader.entryPoints[
    'main'
  ]!.vertexBufferLayouts as VertexBufferLayouts<
    readonly [
      {
        readonly stepMode: 'vertex';
        readonly struct: Struct<{
          readonly position: StructProperty<'vec3<f32>'>;
        }>;
      },
    ]
  >;

  const gpuVertexBuffer = targetNode.vertexBuffers[0]?.buffer;
  if (gpuVertexBuffer) {
    const renderPipeline = engine.gpu!.createRenderPipelineBuilder(
      {
        connections: {
          main: 'main',
        },
        primitive: {
          topology: 'line-list',
        },
      },
      createDebugBoundingBoxVertShader(buffer),
      engine.gpu!.shaders.ColorShader,
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
