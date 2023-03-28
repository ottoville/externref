import type { VertexBuffer } from "../Buffer/Buffer.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import type { VertexShader } from "../Shaders/VertexShader.js";
import { Drawable, type DrawableProps } from "./Drawable.js";
import type { MainNode } from "../../MainNode.js";
import type { Engine } from "../../engine.js";
declare const engine: Engine;

export type MappedVertexBuffers<R extends RenderPipeline> = R extends RenderPipeline<infer VERTEX_SHADER> ? (
    //extract VertexBuffers
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    VERTEX_SHADER extends VertexShader<infer _E, infer VERTEX_BUFFERS> ? (
        {
            [Property in keyof VERTEX_BUFFERS]: ArrayBufferView | VertexBuffer;
        }
    ) : never
) : never

export type DrawableDirectProps = {
    instanceCount?: number;
    firstInstance?: number;
}

export abstract class DrawableDirect<N extends MainNode> extends Drawable<N> {
    constructor(
        drawableProps: DrawableProps<N>,
        {
            instanceCount = 1,
            firstInstance = 0,
        }: DrawableDirectProps = {}
    ) {
        super(drawableProps);
        engine.rust.set_drawble_direct(this.node.id, instanceCount, firstInstance);
    }
    protected set firstInstance(first_instance: number) {
        engine.rust.set_first_instance(this.node.id, first_instance);
    }
    protected get firstInstance() {
        return engine.rust.get_first_instance(this.node.id);
    }
    protected set instanceCount(count: number) {
        engine.rust.set_instance_count(this.node.id, count);
    }
    protected get instanceCount() {
        return engine.rust.get_instance_count(this.node.id);
    }
}