import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import { DrawableIndexed } from '../../Drawables/DrawableIndexed.js';
import type { Engine } from '../../../engine.js';
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
    const renderPipeline = engine.gpu!.createRenderPipelineBuilder({
      desc: {
        connections: {
          main: 'main',
        },
        primitive: {
          topology: 'line-list',
        },
      },
      fragmentShaderBuilder: engine.gpu!.shaders.ColorShader,
      vertexShaderBuilder: createDebugBoundingBoxVertShader(
        engine.gpu!,
        buffer,
      ),
    });
    const mesh = engine.rust.create_debug_mesh_wireframe(
      targetNode.node.id,
      engine.gpu!.gpu,
    );
    const node = new IndexedDataNode(
      {
        can_collide: false,
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
