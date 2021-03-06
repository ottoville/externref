import type { GPU } from "../GPU.js";
import { RenderPipeline } from "./RenderPipeline.js";

export class BindGroupLayout {
    static instances: Set<BindGroupLayout> = new Set();

    childBindGroups: Map<GPUBindGroup, BindGroupLayout> = new Map();

    addRenderPipeline(renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount' | 'colorStates'>,...args: any): RenderPipeline {
        const d = new RenderPipeline(renderPipeline, this, ...args)
        this.renderPipeLines.add(d);
        return d;
    }
    renderPipeLines: Set<RenderPipeline> = new Set();

    subBindGroups: Set<BindGroupLayout> = new Set();
    layout: GPUPipelineLayout;
    constructor(public gpuscene: GPU, public bindGroupLayout: GPUBindGroupLayout, public parent?: BindGroupLayout, public sharedBindgroup?: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), public isDynamic = false, isRoot = false) {
        const layoutTree: GPUBindGroupLayout[] = [bindGroupLayout];
        if (!isRoot){
            if (parent) {
                let curparent: BindGroupLayout | undefined = parent;
                do {
                    layoutTree.unshift(curparent.bindGroupLayout);
                } while (curparent = curparent.parent)
                parent.subBindGroups.add(this);
            } else {
                BindGroupLayout.instances.add(this);
            }
        }
        this.layout = this.gpuscene.device.createPipelineLayout({ bindGroupLayouts: layoutTree });
    }
    addChildLayout(meshBindGroupLayout: BindGroupLayoutOneBinding): LayoutGroupDrawable<[GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutTwoBinding): LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutThreeBinding): LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: BindGroupLayoutFourBinding): LayoutGroupDrawable<[GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry, GPUBindGroupEntry]>
    addChildLayout(meshBindGroupLayout: (BindGroupLayoutOneBinding | BindGroupLayoutTwoBinding | BindGroupLayoutThreeBinding | BindGroupLayoutFourBinding)): LayoutGroupDrawable<GPUBindGroupEntry[]> {
        return new LayoutGroupDrawable(this.gpuscene, meshBindGroupLayout, this, undefined);
    }
    addChildBindGroup(sharedBindgroup: BindGroupOneBinding, isDynamic: boolean): DynamicBindGroupLayout<[number]>
    addChildBindGroup(sharedBindgroup: BindGroupTwoBinding, isDynamic: boolean): DynamicBindGroupLayout<[number, number]>
    addChildBindGroup(sharedBindgroup: BindGroupThreeBinding, isDynamic: boolean): DynamicBindGroupLayout<[number, number, number]>
    addChildBindGroup(sharedBindgroup: BindGroupFourBinding, isDynamic: boolean): DynamicBindGroupLayout<[number, number, number, number]>
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), isDynamic: boolean): DynamicBindGroupLayout<[number, number, number, number]>
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)): BindGroupLayout
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), isDynamic?: boolean): any {
        const old = this.childBindGroups.get(sharedBindgroup)
        if (old)
            return old;
        let r: BindGroupLayout;
        if (!isDynamic)
            r = new BindGroupLayout(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
         else
            r = new DynamicBindGroupLayout(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
        this.childBindGroups.set(sharedBindgroup, r);
        return r;
    }
}

export class DynamicBindGroupLayout<T extends number[]> extends BindGroupLayout {
    addRenderPipeline = (renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount' | 'colorStates'>, offsets: T): RenderPipeline => {
        const d = super.addRenderPipeline(renderPipeline);
        d.dynamicBindGroupOffset = offsets;
        return d;
    }
}
export class LayoutGroupDrawable<T extends GPUBindGroupEntry[]> extends BindGroupLayout {
    addRenderPipeline = (renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount' | 'colorStates'>, bindGroups?: () => T): RenderPipeline => {
        return super.addRenderPipeline(renderPipeline, (rp:RenderPipeline) => {
            if (!bindGroups)
                return;
            rp.bindGroups = new Set([this.gpuscene.device.createBindGroup(
                {
                    layout: this.bindGroupLayout,
                    entries: bindGroups()
                }
            )])
        });
    }
}