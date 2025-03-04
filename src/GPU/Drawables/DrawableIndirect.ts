import { Drawable, DrawableProps } from './Drawable.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import type { MainNode } from '../../MainNode.js';
import { MappedVertexBuffers } from './DrawableDirect.js';
import {
  type INDIRECT_BUFFER,
  type Buffer,
  type IRenderBundleEncoder,
} from '../../webgpu-ts/index.js';

export class DrawableIndirect<
  R extends RenderPipelineProps = RenderPipelineProps,
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
  render(renderEncoder: IRenderBundleEncoder | GPURenderPassEncoder) {
    const encoder =
      renderEncoder instanceof GPURenderPassEncoder
        ? renderEncoder
        : renderEncoder.renderBundleEncoder;
    encoder.drawIndirect(
      renderEncoder instanceof GPURenderPassEncoder
        ? this.buffer.getIndirectBinding()
        : this.buffer.getIndirectBinding(renderEncoder),
      0,
    );
  }
}
