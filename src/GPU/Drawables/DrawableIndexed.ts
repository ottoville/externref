import type { Engine } from '../../engine.js';
import {
  DrawableDirect,
  type DrawableDirectProps,
  type MappedVertexBuffers,
} from './DrawableDirect.js';
import type { LegacyRenderPipeline } from '../RenderPipeline.js';
import type { DrawableProps } from './Drawable.js';
import type { DataNode } from '../../nodes/DataNode.js';
import {
  Buffer,
  BufferUsageEnums,
  RenderBundleEncoder,
  type INDEX_BUFFER,
} from '../../webgpu-ts/index.js';
declare const engine: Engine;

export type DrawableIndexedProps = {
  baseVertex?: number;
  firstIndex?: number;
  GPUIndexFormat?: GPUIndexFormat;
};

export class DrawableIndexed<
  R extends LegacyRenderPipeline = LegacyRenderPipeline,
  N extends DataNode = DataNode,
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
    const indices = this.node.indices;
    if (indices.length > 0) this.setIndexBuffer(indices);
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

  setIndexBuffer(
    buffer: Buffer<INDEX_BUFFER>,
    baseVertex?: number,
    destroyOld?: boolean,
    GPUIndexFormat?: GPUIndexFormat,
  ): Buffer<INDEX_BUFFER>;
  setIndexBuffer(
    buffer: Uint16Array | Uint32Array,
    baseVertex?: number,
    destroyOld?: boolean,
  ): Buffer<INDEX_BUFFER>;
  setIndexBuffer(
    buffer: Uint16Array | Uint32Array | Buffer<INDEX_BUFFER>,
    baseVertex = 0,
    destroyOld = true,
    GPUIndexFormat?: GPUIndexFormat,
  ): Buffer<INDEX_BUFFER> {
    this.#baseVertex = baseVertex;
    if (destroyOld && this.#indexBuffer) {
      this.#indexBuffer.destroy();
    }
    if (buffer instanceof Buffer) {
      this.#indexBuffer = buffer;
      if (GPUIndexFormat) {
        this.#GPUIndexFormat = GPUIndexFormat;
      }
    } else {
      // const gpu = this.renderPipeline.props.vertexShader.props.gpu;
      this.#indexBuffer = new Buffer(
        {
          gpu: engine.gpu!.device,
          label: 'index_' + this.node.label,
          size: buffer.byteLength,
          usages: BufferUsageEnums.INDEX,
        },
        (b) => {
          if (buffer.BYTES_PER_ELEMENT == 4) {
            new Uint32Array(b.getMappedRange()).set(buffer);
            this.#GPUIndexFormat = 'uint32';
          } else {
            new Uint16Array(b.getMappedRange()).set(buffer);
            this.#GPUIndexFormat = 'uint16';
          }
        },
      );
    }
    return this.#indexBuffer;
  }
  render(renderEncoder: RenderBundleEncoder | GPURenderPassEncoder) {
    if (this.#indexBuffer) {
      let encoder: GPURenderBundleEncoder | GPURenderPassEncoder;
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
