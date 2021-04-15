import type { GPU } from "../GPU.js";
import { BindGroupLayout } from "./BindGroupLayout.js";
import { RenderPipeline, Shader, VertexShader } from "./RenderPipeline.js";


type extractGeneric<Type> = Type extends BindGroupLayout<infer X> ? X : never

export class PipelineLayout {
    subBindGroups: Set<PipelineLayout> = new Set();

    addRenderPipeline(vertexShader:VertexShader, fragmentShader:Shader, renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount' | 'fragment' | 'vertex'>): RenderPipeline {
        const d = new RenderPipeline(vertexShader,fragmentShader,renderPipeline, this)
        this.renderPipeLines.add(d);
        return d;
    }
    renderPipeLines: Set<RenderPipeline> = new Set();

    layout: GPUPipelineLayout;
    constructor(public gpuscene: GPU, public bindGroupLayout: BindGroupLayout<[]>, public parent?: PipelineLayout, public sharedBindgroup?: (GPUBindGroup), public isDynamic = false, isRoot = false, debug=false) {
        const layoutTree: GPUBindGroupLayout[] = [bindGroupLayout.layout];
        if (!isRoot && parent) {
            let curparent: PipelineLayout | undefined = parent;
            do {
                layoutTree.unshift(curparent.bindGroupLayout.layout);                
            } while (curparent = curparent.parent)
            parent.subBindGroups.add(this);
        }
        if(debug) {
            console.log(layoutTree);
            debugger;
        }

        this.layout = this.gpuscene.device.createPipelineLayout({ bindGroupLayouts: layoutTree });
    }
    addChildLayout<T extends BindGroupLayout<GPUBindGroupEntry[]>>(meshBindGroupLayout: T,debug?:boolean): LayoutGroupDrawable<extractGeneric<T>> {
        return new LayoutGroupDrawable(this.gpuscene, meshBindGroupLayout, this, undefined,undefined,undefined,debug);
    }
    addChildBindGroup(sharedBindgroup: (GPUBindGroup), isDynamic: boolean): DynamicPipelineLayout
    addChildBindGroup(sharedBindgroup: (GPUBindGroup)): PipelineLayout
    addChildBindGroup(sharedBindgroup: (GPUBindGroup), isDynamic?: boolean): any {
        for(const bg of this.subBindGroups) {
            if(bg.sharedBindgroup === sharedBindgroup) {
                return bg;
            }
        }
        let r: PipelineLayout;
        if (!isDynamic)
            r = new PipelineLayout(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
        else
            r = new DynamicPipelineLayout(this.gpuscene, this.gpuscene.GPUBindGroupLayouts.get(sharedBindgroup)!, this, sharedBindgroup, isDynamic);
        this.subBindGroups.add(r);
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
            RP.createSharedBindGroups = (): Set<GPUBindGroup> => {
                return new Set([this.gpuscene.device.createBindGroup(
                    {
                        layout: this.bindGroupLayout.layout,
                        entries: bindGroups()
                    }
                )])
            }
        }
        return RP;
    }
}