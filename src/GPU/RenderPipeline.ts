import type { RenderPass } from './RenderPasses/RenderPass.js';
import type { BindGroup } from './BindGroup.js';
import type { RenderPipelineLayout } from './PipelineLayout.js';
import type { VertexShader } from './Shaders/VertexShader.js';
import type { FragmentShader } from './Shaders/FragmentShader.js';
import { RenderBundleEncoder } from './RenderBundleEncoder.js';

export type RenderPipelineProps<
  V extends VertexShader,
  F extends FragmentShader,
  R extends RenderPipelineLayout,
> = {
  label: string;
  vertexShader: V;
  fragmentShader: F;
  renderPipeline: Omit<
    GPURenderPipelineDescriptor,
    'depthStencil' | 'fragment' | 'vertex' | 'layout'
  >;
  depthBuffer?: {
    depthWriteEnabled: boolean;
    depthCompare: GPUCompareFunction;
  };
  bindgroupdrawable: R;
  connections: Record<string, string>;
};
export class RenderPipeline<
  V extends VertexShader = VertexShader,
  F extends FragmentShader = FragmentShader,
  R extends RenderPipelineLayout = RenderPipelineLayout,
> {
  dynamicBindGroupOffset: number[] = [];
  public createSharedBindGroups?: () => Set<BindGroup>;
  constructor(public props: Readonly<RenderPipelineProps<V, F, R>>) {}
  destroy(): void {
    this.props.bindgroupdrawable.renderPipeLines.delete(this);
    this.props.bindgroupdrawable.renderPipelineListeners.forEach((cb) => cb());
  }
  draw(
    renderEncoder: RenderBundleEncoder | GPURenderPassEncoder,
    renderPass: RenderPass,
    BindGroupsStart: number,
    dynamicIndices: number[] = [],
  ): number {
    const variant = renderPass.renderPipelines.get(this);
    if (!variant) {
      //console.warn('Renderpipeline,', this.props.label,' has no variants for renderpass', renderPass.label, ', wont draw anything')
      return 0;
    }
    if (!('rootDrawables' in variant)) {
      //There is unresolved promise
      return 0;
    }
    var drawables = variant.rootDrawables;
    if (!drawables || drawables.size == 0) {
      console.warn(
        'No drawables has been set for renderpass',
        this.props.label,
        ', wont draw anything',
      );
      return 0;
    }
    const encoder =
      renderEncoder instanceof RenderBundleEncoder
        ? renderEncoder.renderBundleEncoder
        : renderEncoder;
    encoder.setPipeline(variant.renderpipeline);
    if (this.createSharedBindGroups) {
      this.createSharedBindGroups().forEach((bindgroup) => {
        encoder.setBindGroup(BindGroupsStart++, bindgroup.bindGroup);
      });
    }
    drawables.forEach((drawable) =>
      drawable.draw(renderPass, renderEncoder, BindGroupsStart, dynamicIndices),
    );
    return drawables.size;
  }
}
