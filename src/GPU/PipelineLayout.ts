import { BindGroup } from "./BindGroup.js";
import { BindGroupLayout2, GPUBindingGroupLayoytEntryStrict, MapToGPUBindGroupEntry } from "./BindGroupLayout2.js";
import { VertexShader } from "./RenderPipeline.js";
import { RenderPipeline, RenderPipelineProps } from "./RenderPipeline.js";
type extractGeneric<Type> = Type extends BindGroupLayout2<infer X> ? MapToGPUBindGroupEntry<X> : never


export class PipelineLayout {
    bindGroupLayouts: readonly BindGroupLayout2[];
    layout: GPUPipelineLayout;
    constructor(
        {
            label,
            bindGroupLayouts,
        }: {
            label: string;
            bindGroupLayouts: readonly BindGroupLayout2[];
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
export class RenderPipelineLayout extends PipelineLayout {
    renderPipeLines: Set<RenderPipeline> = new Set();
    subBindGroups: RenderPipelineLayout[] = [];
    bindGroupLayout: BindGroupLayout2;

    constructor(
        props: {
            label: string;
            bindGroupLayouts: readonly BindGroupLayout2[];
        },
        public sharedBindgroup?: BindGroup | undefined) {
            super(props);
            this.bindGroupLayout = props.bindGroupLayouts.at(-1)!;

        }
    createSharedLayout<T extends BindGroupLayout2<GPUBindingGroupLayoytEntryStrict[]>>(label: string, layout: T): SharedPipelineLayout<extractGeneric<T>> {
        const p = new SharedPipelineLayout({
            label,
            bindGroupLayouts: [...this.bindGroupLayouts, layout],
        })
        this.subBindGroups.push(p);
        return p;
    }
    createAppendedLayout<T extends BindGroupLayout2<GPUBindingGroupLayoytEntryStrict[]>>(label: string, layout: T) {
        const p = new BindablePipelineLayout({
            label,
            bindGroupLayouts: [...this.bindGroupLayouts, layout],
        })
        this.subBindGroups.push(p);
        return p;
    }
    addChildBindGroup(label: string, sharedBindgroup: BindGroup): BindablePipelineLayout {
        for (const bg of this.subBindGroups) {
            if (bg.sharedBindgroup === sharedBindgroup && bg instanceof BindablePipelineLayout) {
                return bg;
            }
        }
        const p = new BindablePipelineLayout({
            label,
            bindGroupLayouts: [...this.bindGroupLayouts, sharedBindgroup.layout],
        })
        this.subBindGroups.push(p);
        return p;
    }
}
export class SharedPipelineLayout<T extends GPUBindGroupEntry[]> extends RenderPipelineLayout {
    addRenderPipeline<V extends VertexShader>(
        props: Omit<RenderPipelineProps<V>, 'bindgroupdrawable'>,
        bindGroups: (bindGroup: BindGroup) => T
    ) {
        const RP = new RenderPipeline<V>({
            ...props,
            bindgroupdrawable: this
        })
        this.renderPipeLines.add(RP);

        RP.createSharedBindGroups = (): Set<BindGroup> => {
            return new Set([new BindGroup(this.bindGroupLayout, 'sharedBindGroup', bindGroups)])
        }
        return RP;
    }
}
export class BindablePipelineLayout extends RenderPipelineLayout {
    addRenderPipeline<V extends VertexShader>(
        props: Omit<RenderPipelineProps<V>, 'bindgroupdrawable'>,
        
    ) {
        const d = new RenderPipeline<V>({
            ...props,
            bindgroupdrawable: this
        })
        this.renderPipeLines.add(d);
        return d;
    }
}
