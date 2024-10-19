import type { Engine } from '../../../engine.js';
import { DrawableIndexed } from '../../Drawables/DrawableIndexed.js';
import type { RenderPipelineProps } from '../../RenderPipeline.js';
import {
  createDebugBoundingBoxVertShader,
  type DebugBoundingBoxVertShader,
} from '../../Shaders/devtools/debug_boundingbox.vert.js';
import {
  Buffer,
  BufferUsageEnums,
  VertexBufferLayouts,
} from '../../../webgpu-ts/index.js';
import { RigidBody } from '../../../MainNode.js';
import { IndexedDataNode } from '../../../nodes/IndexedDataNode.js';
import { PositionVertice } from '../../Shaders/structs/Structs.js';
declare const engine: Engine;
const buffer = new VertexBufferLayouts([
  {
    stepMode: 'vertex',
    struct: PositionVertice,
  },
]);
export class BoundingBoxMesh extends IndexedDataNode {
  override drawable:
    | DrawableIndexed<RenderPipelineProps<DebugBoundingBoxVertShader>>
    | undefined;
  constructor(targetNode: DrawableIndexed) {
    const geometry = engine.rust.create_bounding_box_geometry(
      targetNode.node.id,
    );
    const vertices_view = engine.rust.vertices_pointer(geometry);
    const vertices_len = engine.rust.vertices_count(geometry) * 4;

    const debug_render_boundingbox_vertexBuffer = new Buffer(
      {
        gpu: engine.gpu!.device,
        label: 'vertex_debug_bounding_box',
        size: vertices_len * Float32Array.BYTES_PER_ELEMENT,
        usages: BufferUsageEnums.VERTEX,
      },
      (b) => {
        const view = new Float32Array(b.getMappedRange());
        view.set(
          new Float32Array(
            engine.rust.memory.buffer,
            vertices_view,
            vertices_len,
          ),
        );
      },
    );
    super(
      {
        vertices: geometry,
      },
      {
        label: 'BoundingBox_' + targetNode.node.label,
        rigid_body: RigidBody.off,
      },
    );
    this.positions_count = 26;

    const renderPipeline = engine.gpu!.createRenderPipelineBuilder(
      {
        connections: {
          main: 'main',
        },
        primitive: {
          stripIndexFormat: 'uint32',
          topology: 'line-strip',
        },
      },
      createDebugBoundingBoxVertShader(buffer),
      engine.gpu!.shaders.ColorShader,
    );

    this.drawable = new DrawableIndexed({
      bindGroups: [],
      node: this,
      renderPipeline,
      vertexBuffers: [debug_render_boundingbox_vertexBuffer],
    });
  }
}
