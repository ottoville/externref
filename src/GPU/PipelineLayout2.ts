import { BindGroup } from "./BindGroup.js";
import { BindGroupLayout2 } from "./BindGroupLayout2.js";
import { RenderPipeline } from "./RenderPipeline.js";

export class PipelineLayout2 {
    //TODO
    /*addRenderPipeline<V extends VertexShader = VertexShader> (
        label: string,
        vertexShader:V,
        fragmentShader:Shader,
        renderPipeline: Omit<GPURenderPipelineDescriptor, 'depthStencil' | 'fragment' | 'vertex' | 'layout'>,
        depthBuffer?: { depthWriteEnabled:boolean, depthCompare: GPUCompareFunction }) {

        const d = new RenderPipeline<V>(label, vertexShader,fragmentShader,renderPipeline, this,depthBuffer)
        this.renderPipeLines.add(d);
        return d;
    }*/
    renderPipeLines: Set<RenderPipeline> = new Set();

    layout: GPUPipelineLayout;
    sharedBindgroup: BindGroup | undefined;
    constructor(
        {
            label,
            bindGroupLayouts,
        } : {
            label: string;
            bindGroupLayouts: readonly BindGroupLayout2[];
        }) {
        if(!bindGroupLayouts[0]) {
            throw new Error('pipelineLayout needs bindgrouplayouts');
        }
        this.layout = bindGroupLayouts[0].gpu.device.createPipelineLayout(
            {
                bindGroupLayouts: bindGroupLayouts.map(b => b.layout),
                label
            }
        );
    }
}