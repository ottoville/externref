import type { Scene } from "../Scene.js";
import type { BindGroupLayout } from "./BindGroupLayout.js";
import {  DrawableIndexed, DrawableIndirect, DrawableSimple } from "./Drawable.js";
import type { RenderPass } from "./RenderPass.js";
import { TerraNodeGPU } from "../TerraNode.js";

export class RenderPipeline {
    static BindedTerrains: Set<RenderPipeline> = new Set();

    properties: number = 0;
    useTime = true;

    dynamicBindGroupOffset: number[] = [];
    bindGroups: Set<GPUBindGroup> | null = null;
    #GPUIndexFormat: GPUIndexFormat = 'uint16';

    constructor(public renderPipelineDescriptor: Omit<GPURenderPipelineDescriptor, 'colorStates'>, public bindgroupdrawable: BindGroupLayout, createBindGroup?: (rp: RenderPipeline) => void) {
        if (createBindGroup) {
            createBindGroup(this);
            bindgroupdrawable.gpuscene.onResizes.add(() => {
                createBindGroup(this);
            })
        }
        renderPipelineDescriptor.layout = bindgroupdrawable.layout;
        renderPipelineDescriptor.vertexState && renderPipelineDescriptor.vertexState.indexFormat && (this.#GPUIndexFormat = renderPipelineDescriptor.vertexState.indexFormat);
        if (!renderPipelineDescriptor.rasterizationState) {
            renderPipelineDescriptor.rasterizationState = {
                cullMode: 'back',
            }
        }
    }
    destroy(): void {
        this.bindgroupdrawable.renderPipeLines.delete(this);
    }
    draw(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, renderPass: RenderPass, BindGroupsStart: number, scene?: Scene): number {
        const variant = renderPass.renderPipelines.get(this)
        if (!variant)
            return 0;
        if (scene) {
            var drawables = variant.drawables.get(scene);
        } else { //@ts-ignore
            var drawables = variant.rootDrawables;
        }
        if (!drawables || drawables.size == 0)
            return 0;

        renderPassEncoder.setPipeline(variant.renderpipeline);
        variant.renderpipeline.label && console.log('set Pipeline ', variant.renderpipeline.label)
        if (this.bindGroups) {
            this.bindGroups.forEach(bindgroup => renderPassEncoder.setBindGroup(BindGroupsStart++, bindgroup));
        }
        drawables.forEach(drawable => drawable.draw(renderPassEncoder, BindGroupsStart));
        return drawables.size;
    }
    addDrawableIndirect<T extends GPUIndirectBuffer>(scene: Scene | undefined, renderPasses: Set<RenderPass>, buffer: T) {
        return new DrawableIndirect(this, renderPasses, buffer, scene);
    }
    addDrawableSimple(scene: Scene | undefined, renderPasses: Set<RenderPass>, node: TerraNodeGPU, instanceCount = 1, firstVertex = 0, firstInstance = 0): DrawableSimple {
        return new DrawableSimple(this, renderPasses, node, scene, instanceCount, firstVertex, firstInstance)
    }
    addDrawableIndexed(scene: Scene | undefined, renderPasses: Set<RenderPass>, node: TerraNodeGPU, indexBuffer?: GPUIndexBuffer, baseVertex: number = 0, instanceCount = 1, firstIndex = 0, firstInstance = 0): DrawableIndexed {
        return new DrawableIndexed(this, renderPasses, node, indexBuffer, scene, baseVertex, instanceCount, firstIndex, firstInstance, this.#GPUIndexFormat) //todo: read indexformat from this inside method
    }
}