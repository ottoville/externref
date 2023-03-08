import type { Engine } from "../../engine.js";
import { DrawableDirect, type MappedVertexBuffers } from "./DrawableDirect.js";
import { type DrawableNode, MainNode } from "../../MainNode.js";
import type { BindGroup } from "../BindGroup.js";
import { RenderPipeline } from "../RenderPipeline.js";
import { DrawableProps } from "./Drawable.js";
declare const engine: Engine;

export class DrawableSimple<R extends RenderPipeline> extends DrawableDirect {
    #firstVertex = 0;
    #firstInstance = 0;
    node: DrawableNode;
    constructor(
        drawableProps: Omit<DrawableProps, 'label'> & {
            renderPipeline: R;
            vertexBuffers: MappedVertexBuffers<R>
        },
        {
            node,
            instanceCount = 1,
            firstVertex = 0,
            firstInstance = 0,
        }
            :
            {
                node: DrawableNode;
                instanceCount?: number;
                firstVertex?: number;
                firstInstance?: number;

            }
    ) {
        const dynamicBindGroups: [BindGroup, number][] = []
        if (node instanceof MainNode) {
            const dynamicIndex = engine.rust.gpu_alignment(node.ptr);
            dynamicBindGroups.push([drawableProps.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu.BindGroupPosition, dynamicIndex])
        }
        super(
            {
                ...drawableProps,
                label: node.label,
                dynamicBindGroups
            },
            {
                instanceCount,
            });
        this.#firstVertex = firstVertex;
        this.#firstInstance = firstInstance;
        this.node = node;
    }
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        renderEncoder.draw(this.node.positions_count, this.instanceCount, this.#firstVertex, this.#firstInstance);
    }
}