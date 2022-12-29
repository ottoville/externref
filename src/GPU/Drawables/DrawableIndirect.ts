import type { IndirectBuffer, VertexBuffer } from "../Buffer/Buffer.js";
import { Drawable } from "./Drawable.js";
import type { RenderPass } from "../RenderPasses/RenderPass.js";
import type { VertexShader } from "../RenderPipeline.js";
import type { RenderPipeline } from "../RenderPipeline.js";

export class DrawableIndirect<R extends RenderPipeline = RenderPipeline> extends Drawable {
    readonly buffer: IndirectBuffer;
    label: string;
    constructor(
        {
        renderPipeline,
        buffer,
        label,
        renderPasses,
        vertexBuffers
        }
        : {
            renderPipeline: R;
            buffer: IndirectBuffer;
            label: string;
            renderPasses?: Set<RenderPass>;
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
        super( {
            renderPipeline,
            renderPasses,
            vertexBuffers
        });
        this.label = label;
        this.buffer = buffer;
    }
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        renderEncoder.drawIndirect(this.buffer.indirectBuffer, 0);
    }
}