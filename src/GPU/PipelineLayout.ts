import type { BindGroup } from './BindGroup.js';
import type { BGLayout } from './BindGroupLayout.js';
import { RenderPipeline } from './RenderPipeline.js';
import type { GPU } from '../GPU.js';

export type PipeLineLayoutProps<
  B extends readonly BGLayout[],
  S extends BGLayout | undefined,
> = {
  label: string;
  bindGroupLayouts: B;
  sharedLayout?: S;
};
export class PipelineLayout<
  B extends readonly BGLayout[] = readonly BGLayout[],
  S extends BGLayout | undefined = undefined,
> {
  bindGroupLayouts: B;
  layout: GPUPipelineLayout;
  gpu: GPU;
  constructor({ label, bindGroupLayouts }: PipeLineLayoutProps<B, S>) {
    if (!bindGroupLayouts[0]) {
      throw new Error('pipelineLayout needs bindgrouplayouts');
    }
    Object.freeze(bindGroupLayouts);
    this.gpu = bindGroupLayouts[0].gpu;
    this.bindGroupLayouts = bindGroupLayouts;
    this.layout = bindGroupLayouts[0].gpu.device.createPipelineLayout({
      bindGroupLayouts: bindGroupLayouts.map((b) => b.layout),
      label,
    });
  }
}

export class RenderPipelineLayout<
  B extends readonly BGLayout[] = readonly BGLayout[],
  S extends BGLayout | undefined = undefined,
> extends PipelineLayout<B, S> {
  renderPipeLines: Set<RenderPipeline> = new Set();
  subBindGroups: RenderPipelineLayout[] = [];
  bindGroupLayout: BGLayout;

  constructor(
    props: PipeLineLayoutProps<B, S>,
    public sharedBindgroup?: BindGroup | undefined,
  ) {
    super(Object.freeze(props));
    this.bindGroupLayout = props.bindGroupLayouts.at(-1)!;
  }
  renderPipelineListeners: Set<() => void> = new Set();
  createSharedLayout<T extends BGLayout>(label: string, layout: T) {
    const p = new RenderPipelineLayout({
      bindGroupLayouts: [...this.bindGroupLayouts, layout] as [...B, T],
      label,
      sharedLayout: layout,
    });
    this.subBindGroups.push(p);
    return p;
  }
  createAppendedLayout<T extends BGLayout>(label: string, layout: T) {
    const p = new RenderPipelineLayout({
      bindGroupLayouts: [...this.bindGroupLayouts, layout] as [...B, T],
      label,
    });
    this.subBindGroups.push(p);
    return p;
  }
  /*
        Bind group is shared with sub-bindgroups
    */
  addChildBindGroupLayout<T extends BindGroup>(
    label: string,
    sharedBindgroup: T,
  ) {
    const p = new RenderPipelineLayout(
      {
        bindGroupLayouts: [
          ...this.bindGroupLayouts,
          sharedBindgroup.layout,
        ] as [...B, T extends BindGroup<infer X> ? X : never],
        label,
      },
      sharedBindgroup,
    );
    this.subBindGroups.push(p);
    return p;
  }
}
