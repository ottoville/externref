import type { GPU } from "../GPU.js";
import { RenderPipeline, Shader, VertexShader } from "./RenderPipeline.js";
export class PipelineLayout {
    static instances: Set<PipelineLayout> = new Set();

    childBindGroups: Map<GPUBindGroup, PipelineLayout> = new Map();

    addRenderPipeline(vertexShader:VertexShader, fragmentShader:Shader, renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount' | 'fragment' | 'vertex'>): RenderPipeline {
        const d = new RenderPipeline(vertexShader,fragmentShader,renderPipeline, this)
        this.renderPipeLines.add(d);
        return d;
    }
    renderPipeLines: Set<RenderPipeline> = new Set();

    subBindGroups: Set<PipelineLayout> = new Set();
    layout: GPUPipelineLayout;
    constructor(public gpuscene: GPU, public bindGroupLayout: GPUBindGroupLayout, public parent?: PipelineLayout, public sharedBindgroup?: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), public isDynamic = false, isRoot = false) {
        const layoutTree: GPUBindGroupLayout[] = [bindGroupLayout];
        if (!isRoot) {
            if (parent) {
                let curparent: PipelineLayout | undefined = parent;
                do {
                    layoutTree.unshift(curparent.bindGroupLayout);
                } while (curparent = curparent.parent)
                parent.subBindGroups.add(this);
            } else {
                PipelineLayout.instances.add(this);
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
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), isDynamic: boolean): DynamicPipelineLayout
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding)): PipelineLayout
    addChildBindGroup(sharedBindgroup: (BindGroupOneBinding | BindGroupTwoBinding | BindGroupThreeBinding | BindGroupFourBinding), isDynamic?: boolean): any {
        const old = this.childBindGroups.get(sharedBindgroup)
        if (old)
            return old;
        let r: PipelineLayout;
        if (!isDynamic)
            r = new PipelineLayout(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
        else
            r = new DynamicPipelineLayout(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
        this.childBindGroups.set(sharedBindgroup, r);
        return r;
    }
}
export class DynamicPipelineLayout extends PipelineLayout {
    addRenderPipeline = (vertexShader:VertexShader, fragmentShader:Shader,renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount' | 'fragment' | 'vertex'>): RenderPipeline => {
        const d = super.addRenderPipeline(vertexShader,fragmentShader,renderPipeline);
        d.dynamicBindGroupOffset = [0];
        return d;
    }
}
export class LayoutGroupDrawable<T extends GPUBindGroupEntry[]> extends PipelineLayout {
    addRenderPipeline = (vertexShader:VertexShader, fragmentShader:Shader, renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount' | 'fragment' | 'vertex'>, bindGroups?: () => T): RenderPipeline => {
        const RP = super.addRenderPipeline(vertexShader,fragmentShader,renderPipeline);
        if (bindGroups) {
            RP.createBindGroups = (): Set<GPUBindGroup> => {
                return new Set([this.gpuscene.device.createBindGroup(
                    {
                        layout: this.bindGroupLayout,
                        entries: bindGroups()
                    }
                )])
            }
        }
        return RP;
    }
}