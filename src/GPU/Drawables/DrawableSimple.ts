import type { RenderPipeline, VertexShader } from "../RenderPipeline.js";
import type { RenderPass } from "../RenderPasses/RenderPass.js";
import type { Engine } from "../../engine.js";
import { DrawableDirect } from "./DrawableDirect.js";
import { type DrawableNode, MainNode } from "../../MainNode.js";
import type { BindGroup } from "../BindGroup.js";
import type { VertexBuffer } from "../Buffer.js";
declare const engine: Engine;

export class DrawableSimple<R extends RenderPipeline = RenderPipeline> extends DrawableDirect {
    #firstVertex = 0;
    #firstInstance = 0;
    protected node: DrawableNode;
    constructor(
        {
        renderPipeline,
        node,
        renderPasses,
        instanceCount = 1,
        firstVertex = 0,
        firstInstance = 0,
        vertexBuffers
        }
        :
        {
            renderPipeline: R;
            node: DrawableNode;
            renderPasses: Set<RenderPass> | undefined;
            instanceCount?: number;
            firstVertex?: number;
            firstInstance?: number;
            vertexBuffers:
                //extract VertexShader
                R extends RenderPipeline<infer VERTEX_SHADER> ? (
                    //extract VertexBuffers
                    VERTEX_SHADER extends VertexShader<infer VERTEX_BUFFERS> ? (
                        {
                            [Property in keyof VERTEX_BUFFERS]: ArrayBufferView | VertexBuffer;
                        }
                        ) : never
                ) : never
        }
        ) {
        const dynamicBindGroups:[BindGroup, number][]=[]
        if(node instanceof MainNode) {
            const dynamicIndex = engine.rust.gpu_alignment(node.ptr);
            dynamicBindGroups.push([renderPipeline.bindgroupdrawable.bindGroupLayout.gpu.BindGroupPosition, dynamicIndex])
        }
        super({
            renderPipeline,
            dynamicBindGroups,
            label: node.label,
            renderPasses,
            instanceCount,
            vertexBuffers
        });
        this.#firstVertex = firstVertex;
        this.#firstInstance = firstInstance;
        this.node = node;
    }
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        renderEncoder.draw(this.node.positions_count, this.instanceCount, this.#firstVertex, this.#firstInstance);
    }
}