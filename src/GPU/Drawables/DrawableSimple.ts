import type { Engine } from '../../engine.js';
import {
  DrawableDirect,
  DrawableDirectProps,
  type MappedVertexBuffers,
} from './DrawableDirect.js';
import { MainNode } from '../../MainNode.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import { DrawableProps } from './Drawable.js';
import { RenderBundleEncoder } from '../../webgpu-ts/index.js';
declare const engine: Engine;

export class DrawableSimple<
  const R extends RenderPipelineProps,
> extends DrawableDirect<MainNode> {
  #firstVertex = 0;
  constructor(
    drawableProps: Omit<DrawableProps<MainNode>, 'label'> & {
      renderPipeline: R;
      vertexBuffers: MappedVertexBuffers<R>;
    },
    drawableDirectProps?: DrawableDirectProps,
    {
      firstVertex = 0,
    }: {
      firstVertex?: number;
    } = {},
  ) {
    super(drawableProps, drawableDirectProps);
    this.#firstVertex = firstVertex;
  }
  render(renderEncoder: RenderBundleEncoder | GPURenderPassEncoder) {
    const encoder =
      renderEncoder instanceof RenderBundleEncoder
        ? renderEncoder.renderBundleEncoder
        : renderEncoder;

    encoder.draw(
      this.node.positions_count,
      this.instanceCount,
      this.#firstVertex,
      this.firstInstance,
    );
  }
}
