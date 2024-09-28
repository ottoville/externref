import { DebugLinesPipeline } from '../../RenderPipeLines/DebugLinesPipeline.js';
import type { Engine } from '../../../engine.js';
import { DrawableIndexed } from '../../Drawables/DrawableIndexed.js';
import type { RenderPipelineProps } from '../../RenderPipeline.js';
import {
  createDebugBoundingBoxVertShader,
  type DebugBoundingBoxVertShader,
} from '../../Shaders/devtools/debug_boundingbox.vert.js';
import { Buffer, BufferUsageEnums } from '../../../webgpu-ts/index.js';
import { RigidBody } from '../../../MainNode.js';
import { create_rust_vec_ptr } from '../../../Math.js';
import { IndexedDataNode } from '../../../nodes/IndexedDataNode.js';
declare const engine: Engine;

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
      create_rust_vec_ptr(engine.rust.indices_field_pointer(geometry)),
      true,
    );
    this.positions_count = 26;

    const renderPipeline = engine.gpu!.createRenderPipelineBuilder(
      {
        ...DebugLinesPipeline,
        primitive: {
          stripIndexFormat: 'uint32',
          topology: 'line-strip',
        },
      },
      createDebugBoundingBoxVertShader,
      engine.gpu!.shaders.ColorShader,
      {
        stride: 4 as Word<'dword'>,
      },
    );

    this.drawable = new DrawableIndexed({
      bindGroups: [],
      node: this,
      renderPipeline,
      vertexBuffers: [debug_render_boundingbox_vertexBuffer],
    });
  }
}
