import type { GPU } from "../GPU";
import { RenderPass } from "./RenderPass";
import { RenderPipeline } from "./RenderPipeline";

export class BindGroupLayout {
    static instances: Set<BindGroupLayout> = new Set();

    childBindGroups: Map<GPUBindGroup, BindGroupLayout> = new Map();

    addRenderPipeline(renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount'>, ...args: any): RenderPipeline {
        const d = new RenderPipeline(renderPipeline, this)
        this.renderPipeLines.add(d);
        return d;
    }
    renderPipeLines: Set<RenderPipeline> = new Set();

    properties: number = 0
    propertiesLength: number = 0
    subBindGroups: Set<BindGroupLayout> = new Set();
    layout: GPUPipelineLayout;
    onRender: ((time: DOMHighResTimeStamp, timeDelta: number | null) => Promise<GPUCommandBuffer | null>) | null = null;
    sharedBindGroupOverwrites: Map<RenderPass, (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)> = new Map();
    constructor(public gpuscene: GPU, public bindGroupLayout: GPUBindGroupLayout, public parent?: BindGroupLayout, public sharedBindgroup?: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), public isDynamic = false) {
        const layoutTree: GPUBindGroupLayout[] = [bindGroupLayout];
        if (parent) {
            let curparent: BindGroupLayout | undefined = parent;
            do {
                layoutTree.unshift(curparent.bindGroupLayout);
            } while (curparent = curparent.parent)
            parent.subBindGroups.add(this);
        } else
            BindGroupLayout.instances.add(this);
        this.layout = this.gpuscene.device.createPipelineLayout({ bindGroupLayouts: layoutTree });

    }
    addChildLayout(meshBindGroupLayout: BindGroupLayoutOneBinding<GPUBindGroupLayoutEntry>): LayoutGroupDrawable<[GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutTwoBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>): LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutThreeBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]>): LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutFourBinding): LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: (BindGroupLayoutOneBinding<GPUBindGroupLayoutEntry> | BindGroupLayoutTwoBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> | BindGroupLayoutThreeBinding<[GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry, GPUBindGroupLayoutEntry]> | BindGroupLayoutFourBinding)): LayoutGroupDrawable<GPUBindGroupEntry[]> {
        return new LayoutGroupDrawable(this.gpuscene, meshBindGroupLayout, this, undefined);
    }
    addChildBindGroup(sharedBindgroup: BindGroupOneBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number]>
    addChildBindGroup(sharedBindgroup: BindGroupTwoBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number, number]>
    addChildBindGroup(sharedBindgroup: BindGroupThreeBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number, number, number]>
    addChildBindGroup(sharedBindgroup: BindGroupFourBinding, isDynamic: boolean): DynamicBindGroupDrawable<[number, number, number, number]>
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), isDynamic: boolean): DynamicBindGroupDrawable<[number, number, number, number]>
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)): BindGroupLayout
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), isDynamic?: boolean): any {
        const old = this.childBindGroups.get(sharedBindgroup)
        if (old)
            return old;
        let r: BindGroupLayout;
        if (!isDynamic)
            r = new BindGroupLayout(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
         else
            r = new DynamicBindGroupDrawable(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
        this.childBindGroups.set(sharedBindgroup, r);
        return r;
    }
}

export class DynamicBindGroupDrawable<T extends number[]> extends BindGroupLayout {
    addRenderPipeline = (renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount'>, offsets: T): RenderPipeline => {
        const d = super.addRenderPipeline(renderPipeline);
        d.dynamicBindGroupOffset = offsets;
        return d;
    }
}
export class LayoutGroupDrawable<T extends GPUBindGroupEntry[]> extends BindGroupLayout {
    addRenderPipeline = (renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount'>, bindGroups?: () => T): RenderPipeline => {
        const d = super.addRenderPipeline(renderPipeline);
        if (bindGroups) {
            const createBindGroup = () => {
                d.bindGroups = new Set([this.gpuscene.device.createBindGroup(
                    {
                        layout: this.bindGroupLayout,
                        entries: bindGroups()
                    }
                )])
            }
            this.gpuscene.onResizes.add(createBindGroup)
            createBindGroup();
        }
        return d;
    }
}