import type { Engine } from "../../engine.js";
import { DrawableDirect } from "./DrawableDirect.js";
import { type DrawableNode, MainNode } from "../../MainNode.js";
import type { BindGroup } from "../BindGroup.js";
import type { VertexBuffer } from "../Buffer/Buffer.js";
import { RenderPipeline } from "../RenderPipeline2.js";
import { VertexShader } from "../Shaders/VertexShader.js";
import { DrawableProps } from "./Drawable.js";
declare const engine: Engine;

export class DrawableSimple<R extends RenderPipeline> extends DrawableDirect {
    #firstVertex = 0;
    #firstInstance = 0;
    node: DrawableNode;
    constructor(
        drawableProps: Omit<DrawableProps, 'label'> & {
            renderPipeline: R;
            vertexBuffers:
            //extract VertexShader
            R extends RenderPipeline<infer VERTEX_SHADER> ? (
                //extract VertexBuffers
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                VERTEX_SHADER extends VertexShader<infer _E, infer VERTEX_BUFFERS> ? (
                    {
                        [Property in keyof VERTEX_BUFFERS]: ArrayBufferView | VertexBuffer;
                    }
                ) : never
            ) : never
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