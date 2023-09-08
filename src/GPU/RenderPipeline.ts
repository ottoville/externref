import type { RenderPass } from './RenderPasses/RenderPass.js';
import { BindGroup } from './BindGroup.js';
import type {
  BGLayout,
  FragmentShader,
  MapToGPUBindGroupEntry,
  PipelineLayout,
  RenderPipelineBuilder,
  VertexShader,
} from '../webgpu-ts/index.js';
import { RenderBundleEncoder } from './RenderBundleEncoder.js';
import type { RenderPipelineLayout } from './PipelineLayout.js';

type RenderPipelineProps<
  V extends VertexShader,
  F extends FragmentShader,
  R extends RenderPipelineLayout = RenderPipelineLayout,
> = {
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
  bindgroupdrawable: R;
  builder: RenderPipelineBuilder;
};

export class RenderPipeline<
  V extends VertexShader = VertexShader,
  F extends FragmentShader = FragmentShader,
  R extends RenderPipelineLayout = RenderPipelineLayout,
> {
  dynamicBindGroupOffset: number[] = [];
  public readonly props: RenderPipelineProps<V, F, R>;
  pipelineLayout: PipelineLayout;
  constructor(
    props: Readonly<
      RenderPipelineProps<V, F, R> & {
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
    /*
    Get intersection of vertex and fragment pipelinelayouts and
    use first layout from that intersection as layout for renderpipeline
   */
    const [pipelineLayout] = props.vertexShader.props.pipelineLayouts.filter(
      (p) => props.fragmentShader.props.pipelineLayouts.includes(p),
    );
    if (!pipelineLayout) {
      throw new Error('pipelineLayout not found');
    }
    this.pipelineLayout = pipelineLayout;
    props.vertexShader.props.pipelineLayouts.forEach((layout) => {
      //@ts-expect-error
      layout.renderPipeLines.add(this);
      //@ts-expect-error
      layout.renderPipelineListeners.forEach((cb) => cb());
    });
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
