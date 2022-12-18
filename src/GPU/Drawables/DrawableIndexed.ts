import type { RenderPipeline, VertexShader } from "../RenderPipeline.js";
import type { RenderPass } from "../RenderPasses/RenderPass.js";
import { Buffer, type VertexBuffer, type IndexBuffer, GPUBufferUsage } from "../Buffer/Buffer.js";
import type { Engine } from "../../engine.js";
import { DrawableDirect } from "./DrawableDirect.js";
import { BoundableNodeIndexed } from "nodes/BoundableNodeIndexed.js";
declare const engine: Engine;

export class DrawableIndexed<R extends RenderPipeline = RenderPipeline> extends DrawableDirect {
    node: BoundableNodeIndexed;
    #indexBuffer: IndexBuffer | undefined
    #baseVertex: number;
    #firstIndex: number;
    #firstInstance: number;
    #GPUIndexFormat: GPUIndexFormat;
    constructor(
        {
            renderPipeline,
            node,
            renderPasses,
            indexBuffer,
            baseVertex = 0,
            instanceCount = 1,
            firstIndex = 0,
            firstInstance = 0,
            GPUIndexFormat = 'uint16',
            vertexBuffers
        } :
        {
            renderPipeline: R;
            node: BoundableNodeIndexed;
            renderPasses?: Set<RenderPass>;
            indexBuffer?: IndexBuffer;
            baseVertex?: number;
            instanceCount?: number;
            firstIndex?: number;
            firstInstance?: number;
            GPUIndexFormat?: GPUIndexFormat;
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
        super(
            {
                renderPipeline,
                dynamicBindGroups: [[renderPipeline.bindgroupdrawable.bindGroupLayout.gpu.BindGroupPosition, engine.rust.gpu_alignment(node.ptr)]],
                label: node.label,
                renderPasses,
                instanceCount,
                vertexBuffers
            });
        this.node = node;
        this.#indexBuffer = indexBuffer;
        this.#baseVertex = baseVertex;
        this.#firstIndex = firstIndex;
        this.#firstInstance = firstInstance;
        this.#GPUIndexFormat = GPUIndexFormat
    }

    override destroy(preserveVerticeBuffers: number[] = [], preserveIndexBuffer = false): void {
        super.destroy(preserveVerticeBuffers);
        if (!preserveIndexBuffer && this.#indexBuffer)
            this.#indexBuffer.destroy();
    }
    setIndexBuffer(buffer: IndexBuffer, baseVertex?: number, destroyOld?: boolean, GPUIndexFormat?: GPUIndexFormat): IndexBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array, baseVertex?: number, destroyOld?: boolean): IndexBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array | IndexBuffer, baseVertex = 0, destroyOld = true, GPUIndexFormat?: GPUIndexFormat): IndexBuffer {
        this.#baseVertex = baseVertex;
        if (destroyOld && this.#indexBuffer) {
            this.#indexBuffer.destroy();
            this.clearBundles();
        }
        if (buffer instanceof Buffer) {
            this.#indexBuffer = buffer;
            if(GPUIndexFormat) {
                this.#GPUIndexFormat = GPUIndexFormat
            }
        }
        else {
            this.#indexBuffer = Buffer.create(this.renderPipeline.bindgroupdrawable.bindGroupLayout.gpu, buffer.byteLength, [GPUBufferUsage.INDEX], 'index_' + this.label, b => {
                if (buffer.BYTES_PER_ELEMENT == 4) {
                    new Uint32Array(b.getMappedRange()).set(buffer);
                    this.#GPUIndexFormat = 'uint32';
                } else {
                    new Uint16Array(b.getMappedRange()).set(buffer);
                    this.#GPUIndexFormat = 'uint16';
                }
            });

        }
        return this.#indexBuffer;
    }
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        if (this.#indexBuffer) {
            renderEncoder.setIndexBuffer(this.#indexBuffer.indexBuffer, this.#GPUIndexFormat);
            renderEncoder.drawIndexed(this.node.indices_count ?? 0, this.instanceCount, this.#firstIndex, this.#baseVertex, this.#firstInstance);
        }
    }
}