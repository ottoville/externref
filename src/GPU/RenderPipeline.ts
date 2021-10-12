import type { PipelineLayout } from "./PipelineLayout.js";
import {  DrawableIndexed, DrawableIndirect, DrawableSimple } from "./Drawable.js";
import type { RenderPass } from "./RenderPass.js";
import { TerraNodeGPU } from "../TerraNode.js";
import type { GPU } from "../GPU.js";
import type { IndexedNode } from "../DataNode.js";

export class Shader {
    module:GPUShaderModule;
    constructor(gpu:GPU, shader:string, public entryPoint='main') {
        const module=gpu.shaderModules.get(shader);
        if(!module)
            throw(new Error('shader '+shader+' not found'));
        this.module = module;
    }
}
export class VertexShader extends Shader {
    constructor(gpu:GPU,shader:string, entrypoint='main', public buffers:Iterable<GPUVertexBufferLayout>=[]) {
        super(gpu,shader, entrypoint)
    }
}
export class RenderPipeline {

    dynamicBindGroupOffset: number[] = [];
    #GPUIndexFormat: GPUIndexFormat = 'uint16';
    public createSharedBindGroups?: () => Set<GPUBindGroup>
    constructor(
        public vertexShader:VertexShader,
        public fragmentShader:Shader,
        public renderPipelineDescriptor: Omit<GPURenderPipelineDescriptor, 'vertex' | 'fragment'>,
        public bindgroupdrawable: PipelineLayout,
        public depthBuffer? : {depthWriteEnabled:boolean,depthCompare:GPUCompareFunction }) {

        renderPipelineDescriptor.layout = bindgroupdrawable.layout;
        if(!renderPipelineDescriptor.primitive)
            renderPipelineDescriptor.primitive={cullMode:'back', frontFace:'cw'};
        if(!renderPipelineDescriptor.primitive.cullMode)
            renderPipelineDescriptor.primitive.cullMode='back';
        if(!renderPipelineDescriptor.primitive.frontFace)
            renderPipelineDescriptor.primitive.frontFace='cw';

    }
    destroy(): void {
        this.bindgroupdrawable.renderPipeLines.delete(this);
    }
    draw(   renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder,
            renderPass: RenderPass,
            BindGroupsStart: number,
            dynamicIndices:number[]=[]): number {

        const variant = renderPass.renderPipelines.get(this)
        if (!variant)
            return 0;
        var drawables = variant.rootDrawables;
        if (!drawables || drawables.size == 0)
            return 0;

        renderPassEncoder.setPipeline(variant.renderpipeline);
        //variant.renderpipeline.label && console.log('set Pipeline ', variant.renderpipeline.label)
        if(this.createSharedBindGroups) {
            this.createSharedBindGroups().forEach(bindgroup => renderPassEncoder.setBindGroup(BindGroupsStart++, bindgroup));
         }
        drawables.forEach(drawable => drawable.draw(renderPassEncoder, BindGroupsStart,dynamicIndices));
        return drawables.size;
    }
    addDrawableIndirect<T extends GPUIndirectBuffer>(buffer: T, label:string, renderPasses?: Set<RenderPass>) {
        return new DrawableIndirect(this, buffer,label,renderPasses);
    }
    addDrawableSimple(node: TerraNodeGPU<DrawableSimple>, instanceCount = 1, firstVertex = 0, firstInstance = 0, label:string, renderPasses?: Set<RenderPass>): DrawableSimple {
        return new DrawableSimple(this, node, label, renderPasses, instanceCount, firstVertex, firstInstance)
    }
    addDrawableIndexed(node: IndexedNode, label:string, renderPasses?: Set<RenderPass>, indexBuffer?: GPUIndexBuffer, baseVertex = 0, instanceCount = 1, firstIndex = 0, firstInstance = 0): DrawableIndexed {
        return new DrawableIndexed(this, node, label,renderPasses, indexBuffer, baseVertex, instanceCount, firstIndex, firstInstance, this.#GPUIndexFormat) //todo: read indexformat from this inside method
    }
}