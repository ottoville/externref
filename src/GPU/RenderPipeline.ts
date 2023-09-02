import type { RenderPass } from './RenderPasses/RenderPass.js';
import { BindGroup } from './BindGroup.js';
import { type RenderPipelineLayout } from './PipelineLayout.js';
import type { VertexShader } from './Shaders/VertexShader.js';
import type { FragmentShader } from './Shaders/FragmentShader.js';
import { RenderBundleEncoder } from './RenderBundleEncoder.js';
import type {
  BGLayout,
  MapToGPUBindGroupEntry,
} from '../webgpu-ts/BindgroupLayout.js';

type RenderPipelineProps<V extends VertexShader, F extends FragmentShader> = {
  label: string;
  vertexShader: V;
  fragmentShader: F;
  descriptor: Omit<
    GPURenderPipelineDescriptor,
    'depthStencil' | 'fragment' | 'vertex' | 'layout'
  >;
  depthBuffer?: {
    depthWriteEnabled: boolean;
    depthCompare: GPUCompareFunction;
  };
  connections: Record<string, string>;
};

interface RenderPipelineDrawableProps<
  V extends VertexShader = VertexShader,
  F extends FragmentShader = FragmentShader,
  R extends RenderPipelineLayout = RenderPipelineLayout,
> extends RenderPipelineProps<V, F> {
  bindgroupdrawable: R;
}
export class RenderPipeline<
  V extends VertexShader = VertexShader,
  F extends FragmentShader = FragmentShader,
  R extends RenderPipelineLayout = RenderPipelineLayout,
> {
  dynamicBindGroupOffset: number[] = [];
  public readonly props: RenderPipelineDrawableProps<V, F, R>;
  constructor(
    props: Readonly<
      RenderPipelineDrawableProps<V, F, R> & {
        connections: Record<
          keyof V['props']['entryPoints'],
          keyof F['props']['entryPoints']
        >;
      }
    >,
    private sharedBindGroups: R extends RenderPipelineLayout<infer _, infer S>
      ? S extends BGLayout
        ? (bindGroup: BindGroup) => MapToGPUBindGroupEntry<S['entries']>
        : undefined
      : undefined,
  ) {
    this.props = Object.freeze(props);
    Object.values(props.vertexShader.props.entryPoints).forEach((entry) => {
      entry.pipelineLayout.renderPipeLines.add(this);
      entry.pipelineLayout.renderPipelineListeners.forEach((cb) => cb());
    });
  }
  destroy(): void {
    Object.values(this.props.vertexShader.props.entryPoints).forEach(
      (entry) => {
        entry.pipelineLayout.renderPipeLines.delete(this);
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
      drawable.draw(renderPass, renderEncoder, BindGroupsStart, dynamicIndices),
    );
    return drawables.size;
  }
}
