import { BindGroup } from "./BindGroup.js";
import { BindGroupLayout, BindGroupLayoutEntry, GPUBindingGroupLayoytEntryStrict, MapToGPUBindGroupEntry } from "./BindGroupLayout.js";
import { VertexShader } from "./RenderPipeline.js";
import type { VertexShader as VertexShader2 } from "./Shaders/VertexShader.js";
import { RenderPipeline, RenderPipelineProps } from "./RenderPipeline.js";
import { RenderPipeline2, type RenderPipelineProps2 } from "./RenderPipeline2.js";
type extractGeneric<Type> = Type extends BindGroupLayout<infer X> ? MapToGPUBindGroupEntry<X> : never


export class PipelineLayout<B extends readonly BindGroupLayout[] = readonly BindGroupLayout[]> {
    bindGroupLayouts: B;
    layout: GPUPipelineLayout;
    constructor(
        {
            label,
            bindGroupLayouts,
        }: {
            label: string;
            bindGroupLayouts: B;
        }) {
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
export class RenderPipelineLayout<B extends readonly BindGroupLayout[] = readonly BindGroupLayout[]> extends PipelineLayout<B> {
    renderPipeLines: Set<RenderPipeline | RenderPipeline2> = new Set();
    subBindGroups: RenderPipelineLayout[] = [];
    bindGroupLayout: BindGroupLayout;

    constructor(
        props: {
            label: string;
            bindGroupLayouts: B;
        },
        public sharedBindgroup?: BindGroup | undefined) {
        super(props);
        this.bindGroupLayout = props.bindGroupLayouts.at(-1)!;
    }
    createSharedLayout<T extends BindGroupLayout<BindGroupLayoutEntry<GPUBindingGroupLayoytEntryStrict>[]>>(label: string, layout: T): SharedPipelineLayout<extractGeneric<T>> {
        const p = new SharedPipelineLayout({
            label,
            bindGroupLayouts: [...this.bindGroupLayouts, layout],
        })
        return p;
    }
    createAppendedLayout<T extends BindGroupLayout<BindGroupLayoutEntry<GPUBindingGroupLayoytEntryStrict>[]>>(label: string, layout: T) {
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
export class SharedPipelineLayout<T extends GPUBindGroupEntry[]> extends RenderPipelineLayout {
    addRenderPipeline<V extends VertexShader2>(
        props: Omit<RenderPipelineProps2<V>, 'bindgroupdrawable'>,
        bindGroups: (bindGroup: BindGroup) => T
    ) {
        const RP = new RenderPipeline2<V>({
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
export class BindablePipelineLayout<B extends readonly BindGroupLayout[] = readonly BindGroupLayout[]> extends RenderPipelineLayout<B> {
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
        const d = new RenderPipeline<V>({
            ...props,
            bindgroupdrawable: this
        })
        this.renderPipeLines.add(d);
        return d;
    }
    addRenderPipeline2<V extends VertexShader2>(
        props: Omit<RenderPipelineProps2<V>, 'bindgroupdrawable'>,

    ) {
        const d = new RenderPipeline2({
            ...props,
            bindgroupdrawable: this
        })
        this.renderPipeLines.add(d);
        return d;
    }
}
