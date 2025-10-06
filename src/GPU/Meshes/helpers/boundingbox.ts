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
    const mesh = engine.rust.create_bounding_box_mesh(
      targetNode.node.id,
      engine.gpu!.gpu,
    );
    const geometry = engine.rust.get_geometry(mesh);
    const vertices_view = engine.rust.vertices_pointer(geometry, false);
    const vertices_len = engine.rust.vertices_count(geometry) * 4;

    const debug_render_boundingbox_vertexBuffer = new Buffer({
      gpu: engine.gpu!.device,
      label: 'vertex_debug_bounding_box',
      mappedAtCreation: true,
      size: vertices_len * Float32Array.BYTES_PER_ELEMENT,
      usages: BufferUsageEnums.VERTEX,
    });
    const view = new Float32Array(
      debug_render_boundingbox_vertexBuffer.getMappedRange(),
    );
    view.set(
      new Float32Array(engine.rust.memory.buffer, vertices_view, vertices_len),
    );
    super({}, mesh);
    this.positions_count = 26;

    const renderPipeline = engine.gpu!.createRenderPipelineBuilder(
      {
        desc: {
          connections: {
            main: 'main',
          },
          primitive: {
            topology: 'line-strip',
          },
        },
        fragmentShaderBuilder: engine.gpu!.shaders.ColorShader,
        vertexShaderBuilder: createDebugBoundingBoxVertShader(
          engine.gpu!,
          buffer,
        ),
      },
      'uint32',
    );

    this.drawable = new DrawableIndexed({
      bindGroups: [],
      node: this,
      renderPipeline,
      vertexBuffers: [debug_render_boundingbox_vertexBuffer.unmap()],
    });
  }
}
