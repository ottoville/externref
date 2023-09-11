import type { Engine } from '../../engine.js';
import {
  DrawableDirect,
  DrawableDirectProps,
  type MappedVertexBuffers,
} from './DrawableDirect.js';
import { MainNode } from '../../MainNode.js';
import { LegacyRenderPipeline } from '../RenderPipeline.js';
import { DrawableProps } from './Drawable.js';
import { type BindGroup, RenderBundleEncoder } from '../../webgpu-ts/index.js';
declare const engine: Engine;

export class DrawableSimple<
  const R extends LegacyRenderPipeline,
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
    const dynamicIndex = engine.rust.gpu_alignment(drawableProps.node.id);
    //const gpu = drawableProps.renderPipeline.props.vertexShader.props.gpu;
    const dynamicBindGroups: [BindGroup, number][] = [
      [engine.gpu!.BindGroupPosition, dynamicIndex],
    ];
    const props = {
      ...drawableProps,
      dynamicBindGroups,
    };
    super(props, drawableDirectProps);
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
