import type { Engine } from '../../engine.js';
import {
  DrawableDirect,
  type DrawableDirectProps,
  type MappedVertexBuffers,
} from './DrawableDirect.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import type { DrawableProps } from './Drawable.js';
import {
  Buffer,
  BufferUsageEnums,
  RenderBundleEncoder,
  type INDEX_BUFFER,
} from '../../webgpu-ts/index.js';
import type { IndexedDataNode } from '../../nodes/IndexedDataNode.js';
import { Externref } from '../../externref.js';
import { create_rust_vec_ptr } from '../../utils.js';
declare const engine: Engine;

export type DrawableIndexedProps = {
  baseVertex?: number;
  firstIndex?: number;
  GPUIndexFormat?: GPUIndexFormat;
};

export class DrawableIndexed<
  R extends RenderPipelineProps = RenderPipelineProps,
  N extends IndexedDataNode = IndexedDataNode,
> extends DrawableDirect<N> {
  #indexBuffer: Buffer<INDEX_BUFFER> | undefined;
  #baseVertex: number;
  #firstIndex: number;
  #GPUIndexFormat: GPUIndexFormat;
  /**
   * Override indices_count. When not set, defaults to index buffer size
   */
  indices_count?: number;
  constructor(
    drawableProps: Omit<DrawableProps<N>, 'label'> & {
      renderPipeline: R;
      vertexBuffers: MappedVertexBuffers<R>;
    },
    drawableDirectProps?: DrawableDirectProps,
    {
      baseVertex = 0,
      firstIndex = 0,
      GPUIndexFormat = 'uint32',
    }: DrawableIndexedProps = {},
  ) {
    super(drawableProps, drawableDirectProps);
    this.setIndexBuffer(
      engine.rust.indices_pointer_from_geometry(this.node.geometry),
    );

    this.#baseVertex = baseVertex;
    this.#firstIndex = firstIndex;
    this.#GPUIndexFormat = GPUIndexFormat;
  }

  override destroy(
    preserveVerticeBuffers: number[] = [],
    preserveIndexBuffer = false,
  ): void {
    super.destroy(preserveVerticeBuffers);
    if (!preserveIndexBuffer && this.#indexBuffer) {
      this.#indexBuffer.destroy();
    }
  }
  setIndexBuffer(buffer: rust_pointer<'indices'>, baseVertex = 0) {
    this.#baseVertex = baseVertex;
    const gpubuffer = engine.rust.get_indices_gpu_buffer(buffer);
    if (gpubuffer) {
      this.#indexBuffer = gpubuffer.externref;
    } else {
      const indices_ptr = engine.rust.get_indices_pointer(buffer);
      const indices = create_rust_vec_ptr(indices_ptr);
      if (indices[1] > 0) {
        const indexBuffer = new Buffer({
          gpu: engine.gpu!.device,
          label: 'index_' + this.node.label,
          mappedAtCreation: true,
          size: indices[1] * Uint32Array.BYTES_PER_ELEMENT,
          usages: BufferUsageEnums.INDEX,
        });

        new Uint32Array(indexBuffer.getMappedRange()).set(
          new Uint32Array(engine.rust.memory.buffer, indices[0], indices[1]),
        );
        this.#indexBuffer = indexBuffer.unmap();
        this.#GPUIndexFormat = 'uint32';

        engine.rust.set_indices_gpu_buffer(
          buffer,
          new Externref(false, this.#indexBuffer),
        );
      }
    }
  }
  render(renderEncoder: RenderBundleEncoder | GPURenderPassEncoder) {
    if (this.#indexBuffer) {
      let encoder: GPURenderBundleEncoder | GPURenderPassEncoder;
      console.debug('set inxedBuffer', this.#indexBuffer.props.label);
      if (renderEncoder instanceof RenderBundleEncoder) {
        encoder = renderEncoder.renderBundleEncoder;
        encoder.setIndexBuffer(
          this.#indexBuffer.getIndexBinding(renderEncoder),
          this.#GPUIndexFormat,
        );
      } else {
        encoder = renderEncoder;
        encoder.setIndexBuffer(
          this.#indexBuffer.getIndexBinding(),
          this.#GPUIndexFormat,
        );
      }

      const indices_count = this.indices_count ?? this.node.indices_count;
      if (indices_count === 0) {
        console.warn('wont draw', this.node.label, ', zero indices');
      } else {
        console.debug(
          'drawIndexed',
          this.node.label,
          'indices',
          indices_count,
          'instanceCount',
          this.instanceCount,
          'indexFormat',
          this.#GPUIndexFormat,
        );
        encoder.drawIndexed(
          indices_count,
          this.instanceCount,
          this.#firstIndex,
          this.#baseVertex,
          this.firstInstance,
        );
      }
    } else {
      console.warn('wont draw', this.node.label, ', no indexBuffer');
    }
  }
}
