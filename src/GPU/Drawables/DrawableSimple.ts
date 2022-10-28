import type { RenderPipeline } from "../RenderPipeline.js";
import type { RenderPass } from "../RenderPasses/RenderPass.js";
import type { Engine } from "../../engine.js";
import { DrawableDirect } from "./DrawableDirect.js";
import { type DrawableNode, MainNode } from "../../MainNode.js";
import type { BindGroup } from "../BindGroup.js";
declare const engine: Engine;

export class DrawableSimple extends DrawableDirect {
    constructor(
        renderPipeline: RenderPipeline,
        protected node: DrawableNode,
        renderPasses?: Set<RenderPass>,
        instanceCount = 1,
        public firstVertex = 0,
        public firstInstance = 0) {
        const dynamicBindGroups:[BindGroup, number][]=[]
        if(node instanceof MainNode) {
            const dynamicIndex = engine.rust.gpu_alignment(node.ptr);
            dynamicBindGroups.push([renderPipeline.bindgroupdrawable.bindGroupLayout.gpu.BindGroupPosition, dynamicIndex])
        }
        super(renderPipeline, dynamicBindGroups, node.label, renderPasses, instanceCount);
    }
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        renderEncoder.draw(this.node.positions_count, this.instanceCount, this.firstVertex, this.firstInstance);
    }
}