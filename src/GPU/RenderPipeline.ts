import { Drawable } from "./Drawable";
import { GroupDrawable } from "../GPUScene";
import { RenderPass } from "./RenderPass";

export class RenderPipeline {
    static BindedTerrains: Set<RenderPipeline> = new Set();

    properties: number = 0;
    useTime = true;

    dynamicBindGroupOffset: number[] = [];
    bindGroups: Set<GPUBindGroup> | null = null;
    #GPUIndexFormat: GPUIndexFormat = 'uint16';

    constructor(private renderPipelineDescriptor: GPURenderPipelineDescriptor, public bindgroupdrawable: GroupDrawable) {
        renderPipelineDescriptor.layout = bindgroupdrawable.layout;
        renderPipelineDescriptor.vertexState && renderPipelineDescriptor.vertexState.indexFormat && (this.#GPUIndexFormat = renderPipelineDescriptor.vertexState.indexFormat);
        if (!renderPipelineDescriptor.rasterizationState) {
            renderPipelineDescriptor.rasterizationState = {
                cullMode: 'back',
            }
        }
    }
    destroy(): void {
        this.variants.forEach(rp => rp.drawables.forEach(drawable => drawable.destroy()));
        this.bindgroupdrawable.renderPipeLines.delete(this);
    }
    draw(renderPassEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, renderPass: RenderPass, BindGroupsStart: number): void {
        const variant = this.variants.get(renderPass)
        if (!variant || variant.drawables.size == 0)
            return;
        renderPassEncoder.setPipeline(variant.renderpipeline);
        if (this.bindGroups) {
            this.bindGroups.forEach(bindgroup => renderPassEncoder.setBindGroup(BindGroupsStart++, bindgroup));
        }
        variant.drawables.forEach(drawable => drawable.draw(renderPassEncoder));
    }
    variants: Map<RenderPass, RenderPipelineVariant> = new Map();
    addDrawable(renderPasses: Set<RenderPass>, indexOrVertexCount: number, baseVertex: number = 0, instanceCount = 1, firstVertexOrIndex = 0, firstInstance = 0): Drawable {
        const d = new Drawable(this, renderPasses, indexOrVertexCount, baseVertex, instanceCount, firstVertexOrIndex, firstInstance, this.#GPUIndexFormat);
        renderPasses.forEach(rp => {
            let variant = this.variants.get(rp);
            if (!variant) {
                const renderpipeline = this.bindgroupdrawable.gpuscene.device.createRenderPipeline(rp.decoratePipeline(this.renderPipelineDescriptor));
                variant = {
                    renderPass: rp,
                    renderpipeline: renderpipeline,
                    drawables: new Set()
                }
                this.variants.set(rp, variant)
            }
            variant.drawables.add(d);
        });
        return d;
    }
}
interface RenderPipelineVariant {
    renderPass: RenderPass;
    renderpipeline: GPURenderPipeline;
    drawables: Set<Drawable>
}