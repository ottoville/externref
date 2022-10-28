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
    #parent: PipelineLayout | undefined
    bindGroupLayout: BindGroupLayout;
    sharedBindgroup: BindGroup | undefined
    constructor(
        {
            label,
            bindGroupLayout,
            parent,
            sharedBindgroup,
            isRoot = false,
            debug = false
        } : 
        {
            label: string;
            bindGroupLayout: BindGroupLayout;
            parent?: PipelineLayout;
            sharedBindgroup?: BindGroup;
            isRoot?: boolean;
            debug?: boolean;
        }
        ) {
        this.bindGroupLayout = bindGroupLayout;
        this.#parent = parent;
        this.sharedBindgroup = sharedBindgroup;
        const layoutTree: GPUBindGroupLayout[] = [bindGroupLayout.layout];
        if (!isRoot && parent) {
            let curparent: PipelineLayout | undefined = parent;
            do {
                layoutTree.unshift(curparent.bindGroupLayout.layout);                
            } while (curparent = curparent.#parent)
            parent.subBindGroups.push(this);
        }
        if(debug) {
            console.log(layoutTree);
        }
        this.layout = this.bindGroupLayout.gpu.device.createPipelineLayout({ bindGroupLayouts: layoutTree, label });
    }
    addChildLayout<T extends BindGroupLayout<GPUBindGroupEntry[]>>(label:string, meshBindGroupLayout: T,debug = false): LayoutGroupDrawable<extractGeneric<T>> {
        return new LayoutGroupDrawable({
            label, bindGroupLayout: meshBindGroupLayout, parent: this, debug });
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
        if (!isDynamic) {
            r = new PipelineLayout({
                label,
                bindGroupLayout: sharedBindgroup.layout,
                parent: this,
                sharedBindgroup
            });
        }
        else {
            r = new DynamicPipelineLayout({
                label,
                bindGroupLayout: sharedBindgroup.layout,
                parent: this,
                sharedBindgroup,
                debug});
        }
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
                return new Set([this.bindGroupLayout.gpu.device.createBindGroup(
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