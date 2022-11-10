import { BindGroup } from "./BindGroup.js";
import { BindGroupLayout } from "./BindGroupLayout.js";
import { RenderPipeline, Shader, VertexShader } from "./RenderPipeline.js";


type extractGeneric<Type> = Type extends BindGroupLayout<infer X> ? X : never

export class PipelineLayout {
    subBindGroups: PipelineLayout[] = [];

    addRenderPipeline<V extends VertexShader = VertexShader> (
        label: string,
        vertexShader:V,
        fragmentShader:Shader,
        renderPipeline: Omit<GPURenderPipelineDescriptor, 'depthStencil' | 'fragment' | 'vertex' | 'layout'>,
        depthBuffer?: { depthWriteEnabled:boolean, depthCompare: GPUCompareFunction }) {

        const d = new RenderPipeline<V>(label, vertexShader,fragmentShader,renderPipeline, this,depthBuffer)
        this.renderPipeLines.add(d);
        return d;
    }
    renderPipeLines: Set<RenderPipeline> = new Set();

    layout: GPUPipelineLayout;
    #parent: PipelineLayout | undefined
    bindGroupLayout: BindGroupLayout;
    sharedBindgroup: BindGroup | undefined;
    constructor(
        {
            label,
            bindGroupLayout,
            parent,
            sharedBindgroup,
            isRoot = false,
            debug = false
        } : {
            label: string;
            bindGroupLayout: BindGroupLayout;
            parent?: PipelineLayout;
            sharedBindgroup?: BindGroup;
            isRoot?: boolean;
            debug?: boolean;
        }) {
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
    override addRenderPipeline<V extends VertexShader = VertexShader>(label: string, vertexShader:V, fragmentShader:Shader,renderPipeline: Omit<GPURenderPipelineDescriptor, 'sampleCount' | 'fragment' | 'vertex' | 'layout'>) {
        const d = super.addRenderPipeline<V>(label, vertexShader, fragmentShader,renderPipeline);
        d.dynamicBindGroupOffset = [0];
        return d;
    }
}
export class LayoutGroupDrawable<T extends GPUBindGroupEntry[]> extends PipelineLayout {
    override addRenderPipeline<V extends VertexShader = VertexShader>(
        label: string,
        vertexShader: V,
        fragmentShader:Shader,
        renderPipeline: Omit<GPURenderPipelineDescriptor, 'depthStencil' | 'fragment' | 'vertex' | 'layout'>,
        depthBuffer? : {depthWriteEnabled:boolean,depthCompare:GPUCompareFunction },
        bindGroups?: (bindGroup: BindGroup) => T,
        ) {
        const RP = super.addRenderPipeline(label, vertexShader,fragmentShader,renderPipeline,depthBuffer);
        if (bindGroups) {

            new BindGroup(this.bindGroupLayout, 'sharedBindGroup', bindGroups)

            RP.createSharedBindGroups = (): Set<BindGroup> => {
                return new Set([new BindGroup(this.bindGroupLayout, 'sharedBindGroup', bindGroups)])
            }
        }
        return RP;
    }
}