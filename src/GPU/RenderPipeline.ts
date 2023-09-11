import type { RenderPass } from './RenderPasses/RenderPass.js';
import { BindGroup } from './BindGroup.js';
import {
  type BGLayout,
  type FragmentShader,
  type MapToGPUBindGroupEntry,
  RenderBundleEncoder,
  type RenderPipelineBuilder,
  type VertexShader,
} from '../webgpu-ts/index.js';
import type { LegacyRenderPipelineLayout } from './PipelineLayout.js';

type RenderPipelineProps<
  V extends VertexShader,
  F extends FragmentShader,
  R extends LegacyRenderPipelineLayout = LegacyRenderPipelineLayout,
> = {
  label: string;
  vertexShader: V;
  fragmentShader: F;
  descriptor: Omit<
    GPURenderPipelineDescriptor,
    'depthStencil' | 'fragmenst' | 'vertex' | 'layout'
  >;
  depthBuffer?: {
    depthWriteEnabled: boolean;
    depthCompare: GPUCompareFunction;
  };
  connections: Record<string, string>;
  bindgroupdrawable: R;
  builder: RenderPipelineBuilder;
};

export class LegacyRenderPipeline<
  V extends VertexShader = VertexShader,
  F extends FragmentShader = FragmentShader,
  R extends LegacyRenderPipelineLayout = LegacyRenderPipelineLayout,
> {
  dynamicBindGroupOffset: number[] = [];
  public readonly props: RenderPipelineProps<V, F, R>;
  constructor(
    props: Readonly<
      RenderPipelineProps<V, F, R> & {
        connections: Record<
          keyof V['props']['entryPoints'],
          keyof F['props']['entryPoints']
        >;
      }
    >,
    private sharedBindGroups: R extends LegacyRenderPipelineLayout<
      infer _,
      infer S
    >
      ? S extends BGLayout
        ? (bindGroup: BindGroup) => MapToGPUBindGroupEntry<S['entries']>
        : undefined
      : undefined,
  ) {
    this.props = Object.freeze(props);
  }
  destroy(): void {
    Object.values(this.props.vertexShader.props.entryPoints).forEach(
      (entry) => {
        //@ts-expect-error
        entry.pipelineLayout.renderPipeLines.delete(this);
        //@ts-expect-error
        entry.pipelineLayout.renderPipelineListeners.forEach((cb) => cb());
      },
    );
  }
  draw(
    renderEncoder: RenderBundleEncoder | GPURenderPassEncoder,
    renderPass: RenderPass,
    BindGroupsStart: number,
    dynamicIndices: number[] = [],
  ): number {
    //@ts-expect-error
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
    //@ts-expect-error
    encoder.setPipeline(variant.renderpipeline);

    if (this.sharedBindGroups) {
      // TODO: Do not create new BindGroup on each draw call
      const bindgroup = new BindGroup(
        this.props.bindgroupdrawable.bindGroupLayout,
        'sharedBindGroup_' + this.props.label,
        this.sharedBindGroups,
      );
      encoder.setBindGroup(BindGroupsStart++, bindgroup.bindGroup);
    }
    drawables.forEach((drawable) =>
      //@ts-expect-error
      drawable.draw(renderPass, renderEncoder, BindGroupsStart, dynamicIndices),
    );
    return drawables.size;
  }
}
