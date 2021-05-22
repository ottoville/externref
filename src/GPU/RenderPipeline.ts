import type { Scene } from "../Scene.js";
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
    constructor(gpu:GPU,shader:string, entrypoint='main', public buffers?:Iterable<GPUVertexBufferLayout>) {
        super(gpu,shader, entrypoint)
    }
}
export class RenderPipeline {

    dynamicBindGroupOffset: number[] = [];
    #GPUIndexFormat: GPUIndexFormat = 'uint16';
    public createSharedBindGroups?: () => Set<GPUBindGroup>
    constructor(public vertexShader:VertexShader, public fragmentShader:Shader, public renderPipelineDescriptor: Omit<GPURenderPipelineDescriptor, 'colorStates' | 'vertex' | 'fragment'>, public bindgroupdrawable: PipelineLayout) {

        renderPipelineDescriptor.layout = bindgroupdrawable.layout;
        if(!renderPipelineDescriptor.primitive)
            renderPipelineDescriptor.primitive={cullMode:'back'};
        else if(!renderPipelineDescriptor.primitive.cullMode)
            renderPipelineDescriptor.primitive.cullMode='back';

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
    addDrawableIndirect<T extends GPUIndirectBuffer>(scene: Scene | undefined, renderPasses: Set<RenderPass>, buffer: T, label='unnamed') {
        return new DrawableIndirect(this, renderPasses, buffer,label, scene);
    }
    addDrawableSimple(scene: Scene | undefined, renderPasses: Set<RenderPass>, node: TerraNodeGPU<DrawableSimple>, instanceCount = 1, firstVertex = 0, firstInstance = 0, label='unnamed'): DrawableSimple {
        return new DrawableSimple(this, renderPasses, node, label, scene, instanceCount, firstVertex, firstInstance)
    }
    addDrawableIndexed(scene: Scene | undefined, renderPasses: Set<RenderPass>, node: IndexedNode, indexBuffer?: GPUIndexBuffer, baseVertex = 0, instanceCount = 1, firstIndex = 0, firstInstance = 0,label='unnamed'): DrawableIndexed {
        return new DrawableIndexed(this, renderPasses, node, indexBuffer, label, scene, baseVertex, instanceCount, firstIndex, firstInstance, this.#GPUIndexFormat) //todo: read indexformat from this inside method
    }
}