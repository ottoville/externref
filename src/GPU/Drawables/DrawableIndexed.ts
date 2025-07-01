import type { Engine } from '../../engine.js';
import {
  DrawableDirect,
  type DrawableDirectProps,
  type MappedVertexBuffers,
} from './DrawableDirect.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import type { DrawableProps } from './Drawable.js';
import { type IRenderBundleEncoder } from '../../webgpu-ts/index.js';
import type { IndexedDataNode } from '../../nodes/IndexedDataNode.js';
declare const engine: Engine;

export type DrawableIndexedProps = {
  baseVertex?: number;
  firstIndex?: number;
};

export class DrawableIndexed<
  R extends RenderPipelineProps = RenderPipelineProps,
  N extends IndexedDataNode = IndexedDataNode,
> extends DrawableDirect<N> {
  indexBuffer: GPUBuffer | undefined;
  #baseVertex: number;
  #firstIndex: number;
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
    { baseVertex = 0, firstIndex = 0 }: DrawableIndexedProps = {},
  ) {
    super(drawableProps, drawableDirectProps);
    this.setIndexBuffer();

    this.#baseVertex = baseVertex;
    this.#firstIndex = firstIndex;
  }

  override destroy(
    preserveVerticeBuffers: number[] = [],
    preserveIndexBuffer = false,
  ): void {
    super.destroy(preserveVerticeBuffers);
    if (!preserveIndexBuffer && this.indexBuffer) {
      this.indexBuffer.destroy();
    }
  }
  setIndexBuffer(baseVertex = 0) {
    const gpubuffer = engine.rust.get_indices_gpu_buffer(this.node.geometry);
    this.indexBuffer = gpubuffer.externref;
    this.#baseVertex = baseVertex;
  }
  render(renderEncoder: IRenderBundleEncoder | GPURenderPassEncoder) {
    if (this.indexBuffer) {
      const indices_count = this.indices_count ?? this.node.indices_count;
      if (indices_count === 0) {
        console.warn('wont draw', this.node.label, ', zero indices');
      } else {
        engine.rust.render_indexed(
          //@ts-expect-error rust haxx
          renderEncoder.rust_renderbundle_encoder,
          this.node.geometry,
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
