import type { IndirectBuffer } from '../Buffer/Buffer.js';
import { Drawable, DrawableProps } from './Drawable.js';
import type { RenderPipeline } from '../RenderPipeline.js';
import type { MainNode } from '../../MainNode.js';
import { MappedVertexBuffers } from './DrawableDirect.js';

export class DrawableIndirect<
  R extends RenderPipeline = RenderPipeline,
> extends Drawable {
  constructor(
    drawableProps: DrawableProps<MainNode> & {
      vertexBuffers: MappedVertexBuffers<R>;
      renderPipeline: R;
    },
    public readonly buffer: IndirectBuffer,
  ) {
    super(drawableProps);
  }
  render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
    renderEncoder.drawIndirect(this.buffer.indirectBuffer, 0);
  }
}
