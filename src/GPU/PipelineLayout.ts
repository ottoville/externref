import type { GPU } from "../GPU.js";
import type { BindGroup } from "./BindGroup.js";
import { BindGroupLayout } from "./BindGroupLayout.js";
import { RenderPipeline, Shader, VertexShader } from "./RenderPipeline.js";


type extractGeneric<Type> = Type extends BindGroupLayout<infer X> ? X : never

export class PipelineLayout {
    subBindGroups: PipelineLayout[] = [];

    addRenderPipeline(
        label: string,
        vertexShader:VertexShader,
        fragmentShader:Shader,
        renderPipeline: Omit<GPURenderPipelineDescriptor, 'depthStencil' | 'fragment' | 'vertex' | 'layout'>,
        depthBuffer?:{depthWriteEnabled:boolean,depthCompare:GPUCompareFunction }): RenderPipeline {

        const d = new RenderPipeline(label, vertexShader,fragmentShader,renderPipeline, this,depthBuffer)
        this.renderPipeLines.add(d);
        return d;
    }
    renderPipeLines: Set<RenderPipeline> = new Set();

    layout: GPUPipelineLayout;
    constructor(public label:string, public gpu: GPU, public bindGroupLayout: BindGroupLayout, public parent?: PipelineLayout, public sharedBindgroup?: (BindGroup), public isDynamic = false, isRoot = false, debug=false) {
        const layoutTree: GPUBindGroupLayout[] = [bindGroupLayout.layout];
        if (!isRoot && parent) {
            let curparent: PipelineLayout | undefined = parent;
            do {
                layoutTree.unshift(curparent.bindGroupLayout.layout);                
            } while (curparent = curparent.parent)
            parent.subBindGroups.push(this);
        }
        if(debug) {
            console.log(layoutTree);
        }
        this.layout = this.gpu.device.createPipelineLayout({ bindGroupLayouts: layoutTree, label });
    }
    addChildLayout<T extends BindGroupLayout<GPUBindGroupEntry[]>>(label:string, meshBindGroupLayout: T,debug?:boolean): LayoutGroupDrawable<extractGeneric<T>> {
        return new LayoutGroupDrawable(label, this.gpu, meshBindGroupLayout, this, undefined,undefined,undefined,debug);
    }
    addChildBindGroup(label:string, sharedBindgroup: (BindGroup), isDynamic: boolean, debug?:boolean): DynamicPipelineLayout
    addChildBindGroup(label:string, sharedBindgroup: (BindGroup), debug?:boolean): PipelineLayout
    addChildBindGroup(label:string, sharedBindgroup: (BindGroup), isDynamic?: boolean, debug = false): PipelineLayout {
        for(const bg of this.subBindGroups) {
            if(bg.sharedBindgroup === sharedBindgroup) {
                return bg;
            }
        }
        let r: PipelineLayout;
        if (!isDynamic)
            r = new PipelineLayout(label, this.gpu, sharedBindgroup.layout, this, sharedBindgroup, isDynamic);
        else
            r = new DynamicPipelineLayout(label, this.gpu, sharedBindgroup.layout, this, sharedBindgroup, isDynamic,undefined,debug);
        this.subBindGroups.push(r);
        return r;
    }
}
export class DynamicPipelineLayout extends PipelineLayout {
    override addRenderPipeline(label: string, vertexShader:VertexShader, fragmentShader:Shader,renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount' | 'fragment' | 'vertex' | 'layout'>): RenderPipeline {
        const d = super.addRenderPipeline(label, vertexShader,fragmentShader,renderPipeline);
        d.dynamicBindGroupOffset = [0];
        return d;
    }
}
export class LayoutGroupDrawable<T extends GPUBindGroupEntry[]> extends PipelineLayout {
    override addRenderPipeline(
        label: string,
        vertexShader:VertexShader,
        fragmentShader:Shader,
        renderPipeline: Omit<GPURenderPipelineDescriptor, 'depthStencil' | 'fragment' | 'vertex' | 'layout'>,
        depthBuffer? : {depthWriteEnabled:boolean,depthCompare:GPUCompareFunction },
        bindGroups?: () => T,
        ): RenderPipeline {
        const RP = super.addRenderPipeline(label, vertexShader,fragmentShader,renderPipeline,depthBuffer);
        if (bindGroups) {
            RP.createSharedBindGroups = (): Set<GPUBindGroup> => {
                return new Set([this.gpu.device.createBindGroup(
                    {
                        layout: this.bindGroupLayout.layout,
                        entries: bindGroups(),
                        label: 'sharedBindGroup'
                    }
                )])
            }
        }
        return RP;
    }
}