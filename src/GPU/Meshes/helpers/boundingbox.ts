import { DebugLinesPipeline } from '../../RenderPipeLines/DebugLinesPipeline.js';
import type { Engine } from '../../../engine.js';
import { DrawableIndexed } from '../../Drawables/DrawableIndexed.js';
import type { RenderPipelineProps } from '../../RenderPipeline.js';
import type { DebugBoundingBoxVertShader } from '../../Shaders/devtools/debug_boundingbox.vert.js';
import { DataNode, allocate_vec } from '../../../nodes/DataNode.js';
import { Buffer, BufferUsageEnums } from '../../../webgpu-ts/index.js';
declare const engine: Engine;

const indices = Uint32Array.of(
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  4,
  6,
  1,
  5,
  2,
  0,
  3,
  7,
  0,
  6,
  2,
  4,
  0,
  7,
  1,
  3,
  5,
  7,
);

// eslint-disable-next-line import/no-unused-modules
export class BoundingBoxMesh extends DataNode {
  override drawable:
    | DrawableIndexed<RenderPipelineProps<DebugBoundingBoxVertShader>>
    | undefined;
  constructor(targetNode: DrawableIndexed) {
    const [ptr, len, cap] = new Uint32Array(
      engine.rust.memory.buffer,
      engine.rust.bounding_vectors_pointer_simd(targetNode.node.id),
      3,
    );
    const positions_amount = 26;
    //const gpu = targetNode.renderPipeline.props.vertexShader.props.gpu;
    const debug_render_boundingbox_vertexBuffer = new Buffer(
      {
        gpu: engine.gpu!.device,
        label: 'vertex_debug_bounding_box',
        size: positions_amount * 4 * Float32Array.BYTES_PER_ELEMENT,
        usages: BufferUsageEnums.VERTEX,
      },
      (b) => {
        const view = new Float32Array(b.getMappedRange());
        view.set(new Float32Array(engine.rust.memory.buffer, ptr, len));
      },
    );
    const indicesView = allocate_vec(indices);
    super(
      {
        vertices: {
          stride: 4 as Word<'dword'>,
          view: [ptr as rust_pointer<'f32'>, len!, cap!],
        },
      },
      {
        label: 'BoundingBox_' + targetNode.node.label,
        rigid_body: false,
      },
      indicesView,
      true,
    );
    this.positions_count = 26;

    const renderPipeline = engine.gpu!.createRenderPipeline(
      DebugLinesPipeline,
      {
        stripIndexFormat: 'uint32',
        topology: 'line-strip',
      },
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
