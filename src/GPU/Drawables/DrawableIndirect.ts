import { Drawable, DrawableProps } from './Drawable.js';
import type { LegacyRenderPipeline } from '../RenderPipeline.js';
import type { MainNode } from '../../MainNode.js';
import { MappedVertexBuffers } from './DrawableDirect.js';
import {
  type INDIRECT_BUFFER,
  RenderBundleEncoder,
  type Buffer,
} from '../../webgpu-ts/index.js';

export class DrawableIndirect<
  R extends LegacyRenderPipeline = LegacyRenderPipeline,
> extends Drawable {
  override bindGroups = [];
  constructor(
    drawableProps: DrawableProps<MainNode> & {
      vertexBuffers: MappedVertexBuffers<R>;
      renderPipeline: R;
    },
    public readonly buffer: Buffer<INDIRECT_BUFFER>,
  ) {
    super(drawableProps);
  }
  render(renderEncoder: RenderBundleEncoder | GPURenderPassEncoder) {
    const encoder =
      renderEncoder instanceof RenderBundleEncoder
        ? renderEncoder.renderBundleEncoder
        : renderEncoder;
    encoder.drawIndirect(
      renderEncoder instanceof RenderBundleEncoder
        ? this.buffer.getIndirectBinding(renderEncoder)
        : this.buffer.getIndirectBinding(),
      0,
    );
  }
}
