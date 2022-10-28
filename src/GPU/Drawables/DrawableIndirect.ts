import type { IndirectBuffer } from "../Buffer.js";
import { Drawable } from "./Drawable.js";
import type { RenderPass } from "../RenderPasses/RenderPass.js";
import type { RenderPipeline } from "../RenderPipeline.js";

export class DrawableIndirect extends Drawable {
    constructor(
        renderPipeline: RenderPipeline,
        readonly buffer: IndirectBuffer,
        public label: string,
        renderPasses?: Set<RenderPass>,) {
        super(renderPipeline, renderPasses, []);
    }
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        renderEncoder.drawIndirect(this.buffer.indirectBuffer, 0);
    }
}