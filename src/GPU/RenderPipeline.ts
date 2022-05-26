import type { PipelineLayout } from "./PipelineLayout.js";
import {  DrawableIndexed, DrawableIndirect, DrawableSimple } from "./Drawable.js";
import type { RenderPass } from "./RenderPass.js";
import { MainNode } from "../MainNode.js";
import type { GPU } from "../GPU.js";
import type { IndexedNode } from "../DataNode.js";
import type { IndexBuffer, IndirectBuffer } from "./Buffer.js";
import type shaders from "../shaders.json";

export class Shader {
    module:GPUShaderModule;
    constructor(gpu:GPU, shader: keyof typeof shaders) {
        const module=gpu.shaderModules[shader];
        if(!module)
            throw(new Error('shader '+shader+' not found'));
        this.module = module;
    }
}
export class VertexShader extends Shader {
    constructor(gpu:GPU,shader: keyof typeof shaders, public buffers:Iterable<GPUVertexBufferLayout>=[]) {
        super(gpu,shader)
    }
}
export class RenderPipeline {

    dynamicBindGroupOffset: number[] = [];
    #GPUIndexFormat: GPUIndexFormat = 'uint16';
    public createSharedBindGroups?: () => Set<GPUBindGroup>;
    constructor(
        public label: string,
        public vertexShader:VertexShader,
        public fragmentShader:Shader,
        public renderPipelineDescriptor: Omit<GPURenderPipelineDescriptor, 'vertex' | 'fragment' | 'layout'>,
        public bindgroupdrawable: PipelineLayout,
        public depthBuffer? : {depthWriteEnabled:boolean, depthCompare:GPUCompareFunction },
        ) {
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
    addDrawableIndirect(buffer: IndirectBuffer, label:string, renderPasses?: Set<RenderPass>) {
        return new DrawableIndirect(this, buffer,label,renderPasses);
    }
    addDrawableSimple(node: MainNode, instanceCount = 1, firstVertex = 0, firstInstance = 0, renderPasses?: Set<RenderPass>): DrawableSimple {
        return new DrawableSimple(this, node, renderPasses, instanceCount, firstVertex, firstInstance)
    }
    addDrawableIndexed(node: IndexedNode, renderPasses?: Set<RenderPass>, indexBuffer?: IndexBuffer, baseVertex = 0, instanceCount = 1, firstIndex = 0, firstInstance = 0): DrawableIndexed {
        return new DrawableIndexed(this, node, renderPasses, indexBuffer, baseVertex, instanceCount, firstIndex, firstInstance, this.#GPUIndexFormat) //todo: read indexformat from this inside method
    }
}