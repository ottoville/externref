import type { IndirectBuffer, VertexBuffer } from "../Buffer/Buffer.js";
import { Drawable, DrawableProps } from "./Drawable.js";
import type { VertexShader } from "../Shaders/VertexShader.js";
import type { RenderPipeline } from "../RenderPipeline2.js";

export class DrawableIndirect<R extends RenderPipeline = RenderPipeline> extends Drawable {
    constructor(drawableProps: DrawableProps & {
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
        ) : never,
        renderPipeline: R
    }, public readonly buffer: IndirectBuffer) {
        super(drawableProps);
    }
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        renderEncoder.drawIndirect(this.buffer.indirectBuffer, 0);
    }
}