import type { BindGroup } from './BindGroup.js';
import { RenderPipeline } from './RenderPipeline.js';
import { type BGLayout, PipelineLayout } from '../webgpu-ts/index.js';

type PipeLineLayoutProps<B extends readonly BGLayout[]> = {
  label: string;
  bindGroupLayouts: B;
};
interface RenderPipeLineLayoutProps<
  B extends readonly BGLayout[],
  S extends BGLayout | undefined,
> extends PipeLineLayoutProps<B> {
  sharedLayout?: S;
}

export class RenderPipelineLayout<
  B extends readonly BGLayout[] = readonly BGLayout[],
  S extends BGLayout | undefined = undefined,
> extends PipelineLayout<B> {
  renderPipeLines: Set<RenderPipeline> = new Set();
  subBindGroups: RenderPipelineLayout[] = [];
  bindGroupLayout: BGLayout;

  constructor(
    props: RenderPipeLineLayoutProps<B, S>,
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
