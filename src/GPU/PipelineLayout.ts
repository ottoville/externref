import { BindGroup } from "./BindGroup.js";
import type { BGLayout, BindGroupLayoutEntry, GPUBindingGroupLayoytEntryStrict, MapToGPUBindGroupEntry } from "./BindGroupLayout.js";
import { RenderPipeline, type RenderPipelineProps } from "./RenderPipeline2.js";
import type { VertexShader } from "./Shaders/VertexShader.js";
type extractGeneric<Type> = Type extends BGLayout<infer X> ? MapToGPUBindGroupEntry<X> : never
type Last<T extends BGLayout[]> = T extends [...BGLayout[], infer R] ? R : never

export type PipeLineLayoutProps<B extends readonly BGLayout[]> = {
    label: string;
    bindGroupLayouts: B;
}
export class PipelineLayout<B extends readonly BGLayout[] = readonly BGLayout[]> {
    bindGroupLayouts: B;
    layout: GPUPipelineLayout;
    constructor(
        {
            label,
            bindGroupLayouts,
        }: PipeLineLayoutProps<B>) {
        if (!bindGroupLayouts[0]) {
            throw new Error('pipelineLayout needs bindgrouplayouts');
        }
        this.bindGroupLayouts = bindGroupLayouts;
        this.layout = bindGroupLayouts[0].gpu.device.createPipelineLayout(
            {
                bindGroupLayouts: bindGroupLayouts.map(b => b.layout),
                label
            }
        );
    }
}
export class RenderPipelineLayout<B extends readonly BGLayout[] = readonly BGLayout[]> extends PipelineLayout<B> {
    renderPipeLines: Set<RenderPipeline> = new Set();
    subBindGroups: RenderPipelineLayout[] = [];
    bindGroupLayout: BGLayout;

    constructor(
        props: PipeLineLayoutProps<B>,
        public sharedBindgroup?: BindGroup | undefined) {
        super(props);
        this.bindGroupLayout = props.bindGroupLayouts.at(-1)!;
    }
    createSharedLayout<T extends BGLayout<BindGroupLayoutEntry<GPUBindingGroupLayoytEntryStrict>[]>>(label: string, layout: T) {
        const p = new SharedPipelineLayout({
            label,
            bindGroupLayouts: [...this.bindGroupLayouts, layout] as [...B, T],
        })
        this.subBindGroups.push(p);
        return p;
    }
    createAppendedLayout<T extends BGLayout<BindGroupLayoutEntry<GPUBindingGroupLayoytEntryStrict>[]>>(label: string, layout: T) {
        const p = new BindablePipelineLayout({
            label,
            bindGroupLayouts: [...this.bindGroupLayouts, layout] as const,
        })
        this.subBindGroups.push(p);
        return p;
    }
    /*
        Bind group is shared with sub-bindgroups
    */
    addChildBindGroupLayout<T extends BindGroup>(label: string, sharedBindgroup: T): BindablePipelineLayout<readonly [...B, T extends BindGroup<infer X> ? X : never]>
    {
        for (const bg of this.subBindGroups) {
            if (bg.sharedBindgroup === sharedBindgroup && bg instanceof BindablePipelineLayout) {
                return bg;
            }
        }
        const p = new BindablePipelineLayout({
            label,
            bindGroupLayouts: [...this.bindGroupLayouts, sharedBindgroup.layout] as const,
        }, sharedBindgroup)
        this.subBindGroups.push(p);
        //@ts-expect-error bug in TS?
        return p;
    }
}

export class SharedPipelineLayout<B extends BGLayout[]> extends RenderPipelineLayout<B> {
    constructor(
        props: PipeLineLayoutProps<B>) {
        super(props);
    }
    addRenderPipeline<V extends VertexShader>(
        props: Omit<RenderPipelineProps<V>, 'bindgroupdrawable'>,
        bindGroups: (bindGroup: BindGroup) => extractGeneric<Last<B>>
    ) {
        const RP:RenderPipeline<V> = new RenderPipeline<V>({
            ...props,
            bindgroupdrawable: this
        })
        this.renderPipeLines.add(RP);

        RP.createSharedBindGroups = (): Set<BindGroup> => {
            return new Set([new BindGroup(this.bindGroupLayout, 'sharedBindGroup_' + props.label, bindGroups)])
        }
        return RP;
    }
}
export class BindablePipelineLayout<B extends readonly BGLayout[] = readonly BGLayout[]> extends RenderPipelineLayout<B> {
    constructor(
        props: {
            label: string;
            bindGroupLayouts: B;
        },
        sharedBindgroup?: BindGroup | undefined) {
        super(props, sharedBindgroup);
    }
    addRenderPipeline<V extends VertexShader>(
        props: Omit<RenderPipelineProps<V>, 'bindgroupdrawable'>,

    ): RenderPipeline<V> {
        const d = new RenderPipeline({
            ...props,
            bindgroupdrawable: this
        })
        this.renderPipeLines.add(d);
        return d;
    }
}
