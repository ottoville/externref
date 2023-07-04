import { BindGroup } from './BindGroup.js';
import type { BGLayout, MapToGPUBindGroupEntry } from './BindGroupLayout.js';
import { RenderPipeline, type RenderPipelineProps } from './RenderPipeline.js';
import type { VertexShader } from './Shaders/VertexShader.js';
import type { GPU } from '../GPU.js';
import type { FragmentShader } from './Shaders/FragmentShader.js';
type extractGeneric<Type> = Type extends BGLayout<infer X> ? MapToGPUBindGroupEntry<X> : never
type Last<T extends BGLayout[]> = T extends [...BGLayout[], infer R] ? R : never
// eslint-disable-next-line @typescript-eslint/no-shadow
type Head<T extends readonly BGLayout[]> = T extends readonly [ ...infer Head, BGLayout ] ? Head : never[];

export type PipeLineLayoutProps<B extends readonly BGLayout[]> = {
    label: string;
    bindGroupLayouts: B;
}
export class PipelineLayout<B extends readonly BGLayout[] = readonly BGLayout[]> {
    bindGroupLayouts: B;
    layout: GPUPipelineLayout;
    gpu: GPU;
    constructor(
        {
            label,
            bindGroupLayouts,
        }: PipeLineLayoutProps<B>) {
        if (!bindGroupLayouts[0]) {
            throw new Error('pipelineLayout needs bindgrouplayouts');
        }
        Object.freeze(bindGroupLayouts);
        this.gpu = bindGroupLayouts[0].gpu;
        this.bindGroupLayouts = bindGroupLayouts;
        this.layout = bindGroupLayouts[0].gpu.device.createPipelineLayout(
            {
                bindGroupLayouts: bindGroupLayouts.map(b =>
                    b.layout),
                label,
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
        super(Object.freeze(props));
        this.bindGroupLayout = props.bindGroupLayouts.at(-1)!;
    }
    renderPipelineListeners: Set<() => void> = new Set();
    protected addRenderPipelineSuper<V extends VertexShader, F extends FragmentShader>(
        props: Omit<RenderPipelineProps<V, F>, 'bindgroupdrawable'>

    ): RenderPipeline<V> {
        const d = new RenderPipeline({
            ...props,
            bindgroupdrawable: this,
        });
        this.renderPipeLines.add(d);
        this.renderPipelineListeners.forEach(cb =>
            cb());

        return d;
    }
    createSharedLayout<T extends BGLayout>(label: string, layout: T) {
        const p = new SharedPipelineLayout({
            bindGroupLayouts: [
                ...this.bindGroupLayouts,
                layout
            ] as [...B, T],
            label,
        });
        this.subBindGroups.push(p);
        return p;
    }
    createAppendedLayout<T extends BGLayout>(label: string, layout: T) {
        const p = new BindablePipelineLayout({
            bindGroupLayouts: [
                ...this.bindGroupLayouts,
                layout
            ] as [...B, T],
            label,
        });
        this.subBindGroups.push(p);
        return p;
    }
    /*
        Bind group is shared with sub-bindgroups
    */
    addChildBindGroupLayout<T extends BindGroup>(label: string, sharedBindgroup: T): BindablePipelineLayout<[...B, T extends BindGroup<infer X> ? X : never]> {
        for (const bg of this.subBindGroups) {
            if (bg.sharedBindgroup === sharedBindgroup && bg instanceof BindablePipelineLayout) {
                return bg;
            }
        }
        const p = new BindablePipelineLayout({
            bindGroupLayouts: [
                ...this.bindGroupLayouts,
                sharedBindgroup.layout
            ] as [...B, typeof sharedBindgroup.layout],
            label,
        },
        sharedBindgroup);
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
    addRenderPipeline<V extends VertexShader, F extends FragmentShader>(
        props: Omit<RenderPipelineProps<V, F>, 'bindgroupdrawable'>,
        bindGroups: (bindGroup: BindGroup) => extractGeneric<Last<B>>
    ) {
        const RP = this.addRenderPipelineSuper(props);
        RP.createSharedBindGroups = (): Set<BindGroup> => {
            return new Set([
                new BindGroup(this.bindGroupLayout,
                    'sharedBindGroup_' + props.label,
                    bindGroups)
            ]);
        };
        return RP;
    }
}
export class BindablePipelineLayout<
B extends readonly BGLayout[] = readonly BGLayout[]> extends RenderPipelineLayout<B> {
    constructor(
        props: {
            label: string;
            bindGroupLayouts: B;
        },
        sharedBindgroup?: BindGroup | undefined) {
        super(props,
            sharedBindgroup);
    }
    addRenderPipeline<
        V extends VertexShader   <B>,
        F extends FragmentShader <B|Head<B>|Head<Head<B>>|Head<Head<Head<B>>>|Head<Head<Head<Head<B>>>>|Head<Head<Head<Head<Head<B>>>>>|readonly never []>
        >(
        props: Omit<RenderPipelineProps<V, F>, 'bindgroupdrawable'>

    ): RenderPipeline<V> {
        return this.addRenderPipelineSuper(props);
    }
}
