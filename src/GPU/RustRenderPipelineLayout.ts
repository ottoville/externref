import {
  BGLayout,
  BindGroup,
  BindGroupRef,
  IRenderBundleEncoder,
  RenderPipelineLayout,
} from '../webgpu-ts/index.js';

export class RustRenderPipelineLayout<
  const B extends readonly BGLayout[] = readonly BGLayout[],
> extends RenderPipelineLayout<B> {
  override setBindGroups(
    renderEncoder: GPURenderPassEncoder | IRenderBundleEncoder,
    bindgroups: readonly BindGroupRef[],
    bindGroupStartIndex: number,
  ) {
    if (renderEncoder instanceof GPURenderPassEncoder) {
      bindgroups.forEach((bindGroup) => {
        console.debug(
          'set bindgroup',
          bindGroupStartIndex,
          bindGroup.bindGroup.bindGroup.label,
        );
        renderEncoder.setBindGroup(
          bindGroupStartIndex++,
          bindGroup.bindGroup.bindGroup,
          bindGroup.offsets,
        );
      });
    } else {
      bindgroups.forEach((bindGroup) => {
        console.debug(
          'set bindgroup',
          bindGroupStartIndex,
          bindGroup.bindGroup.bindGroup.label,
        );
        if (
          'rust_renderbundle_encoder' in renderEncoder &&
          'getForRenderBundle2' in bindGroup.bindGroup
        ) {
          const rust_renderbundle_encoder =
            renderEncoder.rust_renderbundle_encoder as rust_pointer<'renderbundleencoder'>;
          //@ts-expect-error rust hax
          bindGroup.bindGroup.getForRenderBundle2(
            rust_renderbundle_encoder,
            bindGroupStartIndex++,
            bindGroup.offsets,
          );
        } else {
          renderEncoder.renderBundleEncoder.setBindGroup(
            bindGroupStartIndex++,
            bindGroup.bindGroup.getForRenderBundle(renderEncoder),
            bindGroup.offsets,
          );
        }
      });
    }
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
  override appendBinds<
    //Shared bindgroups or layout
    const T extends readonly [BindGroupRef | BGLayout, ...BGLayout[]],
  >(label: string, sharedBindgroups: T) {
    const p = new RustRenderPipelineLayout(
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
    this.subBindGroups.push(p as RenderPipelineLayout);
    return p;
  }
}
