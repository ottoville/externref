import {
  RenderPipelineLayout,
  BGLayout,
  type BindGroup,
} from '../webgpu-ts/index.js';

type PipeLineLayoutProps<B extends readonly BGLayout[]> = {
  label: string;
  bindGroupLayouts: B;
};

type BindGroupRef = {
  readonly bindGroup: BindGroup;
  readonly offsets?: number[];
};

export class LegacyRenderPipelineLayout<
  B extends readonly BGLayout[] = readonly BGLayout[],
> extends RenderPipelineLayout<B> {
  subBindGroups: LegacyRenderPipelineLayout[] = [];
  bindGroupLayout: BGLayout;

  constructor(
    props: PipeLineLayoutProps<B>,
    public sharedBindgroups: readonly BindGroupRef[] = [],
  ) {
    super(Object.freeze(props));
    this.bindGroupLayout = props.bindGroupLayouts.at(-1)!;
  }

  /**
   * Appends bindgroups or bindgrouplayouts for a bindgroup layout.
   * @param label
   * @param sharedBindgroups
   * A tuple of bindgroups mixed with layouts. If bindgroup is given, it is binded and
   * shared with all renderpipelines attached to this layout. For layouts, each
   * drawable will bind its own bindgroup.
   * @returns
   */
  appendBinds<
    //Shared bindgroups or layout
    const T extends readonly [BindGroupRef | BGLayout, ...BGLayout[]],
  >(label: string, sharedBindgroups: T) {
    const p = new LegacyRenderPipelineLayout(
      {
        bindGroupLayouts: [
          ...this.bindGroupLayouts,
          ...sharedBindgroups.map((bindGroupOrLayout) => {
            if (bindGroupOrLayout instanceof BGLayout) {
              return bindGroupOrLayout;
            } else return bindGroupOrLayout.bindGroup.layout;
          }),
        ] as unknown as [
          ...B,
          ...{
            [K in keyof T]: T[K] extends {
              bindGroup: BindGroup;
            }
              ? T[K]['bindGroup']['layout']
              : T[K] extends BGLayout
              ? T[K]
              : never;
          },
        ],
        label,
      },
      sharedBindgroups.filter(
        (bg): bg is BindGroupRef => !(bg instanceof BGLayout),
      ),
    );
    this.subBindGroups.push(p);
    return p;
  }
}
