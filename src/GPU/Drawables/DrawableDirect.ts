import { type DrawableNode } from "../../MainNode.js";
import { Drawable } from "./Drawable.js";
import type { RenderPipeline } from "../RenderPipeline";
import type { BindGroup } from "../BindGroup.js";
import type { RenderPass } from "../RenderPasses/RenderPass.js";
import { VertexBuffer } from "../Buffer.js";

export abstract class DrawableDirect extends Drawable {
    #instanceCount: number;
    abstract node: DrawableNode
    public label: string
    constructor(
        {
            renderPipeline,
            dynamicBindGroups,
            label,
            renderPasses,
            instanceCount = 1,
            vertexBuffers
        } : 
        {
            renderPipeline: RenderPipeline;
            dynamicBindGroups: [BindGroup, number][];
            label: string;
            renderPasses: Set<RenderPass> | undefined;
            instanceCount: number;
            vertexBuffers?: (ArrayBufferView | VertexBuffer)[];
        }
    ) {
        super({
            renderPipeline,
            renderPasses,
            dynamicBindGroups,
            vertexBuffers
        });
        this.label = label;
        if (instanceCount == 0)
            console.warn('Added drawable with 0 instances, nothing will be drawn');
        this.#instanceCount = instanceCount;
    }
    set instanceCount(count: number) {
        if (count === this.#instanceCount)
            return;
        this.#instanceCount = count;
        this.clearBundles();
    }
    get instanceCount() {
        return this.#instanceCount;
    }
}