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
  #baseVertex: number;
  #firstIndex: number;
  constructor(
    drawableProps: Omit<DrawableProps<N>, 'label'> & {
      renderPipeline: R;
      vertexBuffers: MappedVertexBuffers<R>;
    },
    drawableDirectProps?: DrawableDirectProps,
    { baseVertex = 0, firstIndex = 0 }: DrawableIndexedProps = {},
  ) {
    super(drawableProps, drawableDirectProps);

    this.#baseVertex = baseVertex;
    this.#firstIndex = firstIndex;
  }

  render(renderEncoder: IRenderBundleEncoder | GPURenderPassEncoder) {
    engine.rust.render_indexed(
      //@ts-expect-error rust haxx
      renderEncoder.rust_renderbundle_encoder,
      this.node.geometry,
      this.instanceCount,
      this.#firstIndex,
      this.#baseVertex,
      this.firstInstance,
    );
  }
}
