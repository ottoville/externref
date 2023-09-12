import {
  RenderPipelineLayout,
  type BGLayout,
  type BindGroup,
} from '../webgpu-ts/index.js';

type PipeLineLayoutProps<B extends readonly BGLayout[]> = {
  label: string;
  bindGroupLayouts: B;
};

export class LegacyRenderPipelineLayout<
  B extends readonly BGLayout[] = readonly BGLayout[],
> extends RenderPipelineLayout<B> {
  subBindGroups: LegacyRenderPipelineLayout[] = [];
  bindGroupLayout: BGLayout;

  constructor(
    props: PipeLineLayoutProps<B>,
    public sharedBindgroups: readonly {
      bindGroup: BindGroup;
      offsets?: number[];
    }[] = [],
  ) {
    super(Object.freeze(props));
    this.bindGroupLayout = props.bindGroupLayouts.at(-1)!;
  }
  createAppendedLayout<T extends BGLayout[]>(label: string, layout: T) {
    const p = new LegacyRenderPipelineLayout({
      bindGroupLayouts: [...this.bindGroupLayouts, ...layout] as [...B, ...T],
      label,
    });
    this.subBindGroups.push(p);
    return p;
  }
  /**
   * Bind groups are shared with renderpipelines
   * @param label
   * @param sharedBindgroups Bindgroups that are binded for all renderpipelines
   * @returns
   */
  addChildBindGroupLayouts<
    const T extends readonly { bindGroup: BindGroup; offsets?: number[] }[],
  >(label: string, sharedBindgroups: T) {
    const p = new LegacyRenderPipelineLayout(
      {
        bindGroupLayouts: [
          ...this.bindGroupLayouts,
          ...sharedBindgroups.map((bindGroup) => bindGroup.bindGroup.layout),
        ] as unknown as [
          ...B,
          ...{
            [K in keyof T]: T[K]['bindGroup']['layout'];
          },
        ],
        label,
      },
      sharedBindgroups,
    );
    this.subBindGroups.push(p);
    return p;
  }
}
