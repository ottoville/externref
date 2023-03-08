import type { VertexBuffer } from "../Buffer/Buffer.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import type { VertexShader } from "../Shaders/VertexShader.js";
import { type DrawableNode } from "../../MainNode.js";
import { Drawable, DrawableProps } from "./Drawable.js";

export type MappedVertexBuffers<R extends RenderPipeline> = R extends RenderPipeline<infer VERTEX_SHADER> ? (
    //extract VertexBuffers
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    VERTEX_SHADER extends VertexShader<infer _E, infer VERTEX_BUFFERS> ? (
        {
            [Property in keyof VERTEX_BUFFERS]: ArrayBufferView | VertexBuffer;
        }
    ) : never
) : never

export abstract class DrawableDirect extends Drawable {
    #instanceCount: number;
    abstract node: DrawableNode
    constructor(
        drawableProps: DrawableProps,
        {
            instanceCount = 1,
        }:
            {
                instanceCount: number;
            }
    ) {
        super(drawableProps);
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