import { Scene } from "../Scene";
import { BindGroupLayout } from "./BindGroupLayout";
import { Drawable } from "./Drawable";
import { RenderPass } from "./RenderPass";

export class RenderPipeline {
    static BindedTerrains: Set<RenderPipeline> = new Set();

    properties: number = 0;
    useTime = true;

    dynamicBindGroupOffset: number[] = [];
    bindGroups: Set<GPUBindGroup> | null = null;
    #GPUIndexFormat: GPUIndexFormat = 'uint16';

    constructor(public renderPipelineDescriptor: GPURenderPipelineDescriptor, public bindgroupdrawable: BindGroupLayout) {
        renderPipelineDescriptor.layout = bindgroupdrawable.layout;
        renderPipelineDescriptor.vertexState && renderPipelineDescriptor.vertexState.indexFormat && (this.#GPUIndexFormat = renderPipelineDescriptor.vertexState.indexFormat);
        if (!renderPipelineDescriptor.rasterizationState) {
            renderPipelineDescriptor.rasterizationState = {
                cullMode: 'back',
            }
        }
    }
    destroy(): void {
        this.variants.forEach(rp => rp.drawables.forEach(scene => scene.forEach(drawable => drawable.destroy())));
        this.bindgroupdrawable.renderPipeLines.delete(this);
    }
    draw(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, renderPass: RenderPass, BindGroupsStart: number, scene?: Scene): void {
        const variant = this.variants.get(renderPass)
        if (!variant)
            return;
        if (scene) {
            var drawables = variant.drawables.get(scene);
        } else { //@ts-ignore
            var drawables = variant.rootDrawables;
        }
        if (!drawables || drawables.size == 0)
            return;

        renderPassEncoder.setPipeline(variant.renderpipeline);
        if (this.bindGroups) {
            this.bindGroups.forEach(bindgroup => renderPassEncoder.setBindGroup(BindGroupsStart++, bindgroup));
        }
        drawables.forEach(drawable => drawable.draw(renderPassEncoder, BindGroupsStart));
    }

    variants: Map<RenderPass, RenderPipelineVariant> = new Map();
    addDrawable(scene: Scene | undefined, renderPasses: RenderPass[], indexOrVertexCount: number, baseVertex: number = 0, instanceCount = 1, firstVertexOrIndex = 0, firstInstance = 0): Drawable {
        return new Drawable(this, new Set(renderPasses), indexOrVertexCount, scene, baseVertex, instanceCount, firstVertexOrIndex, firstInstance, this.#GPUIndexFormat);
    }
}
interface RenderPipelineVariant {
    renderPass: RenderPass;
    renderpipeline: GPURenderPipeline;
    drawables: Map<Scene, Set<Drawable>>
    rootDrawables: Set<Drawable>
}