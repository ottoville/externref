import { Buffer, type IndexBuffer, GPUBufferUsage } from "../Buffer/Buffer.js";
import type { Engine } from "../../engine.js";
import { DrawableDirect, DrawableDirectProps, type MappedVertexBuffers } from "./DrawableDirect.js";
import { NodeIndexed } from "../../nodes/NodeIndexed.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import { DrawableProps } from "./Drawable.js";
import type { RenderPass } from "../../GPU/RenderPasses/RenderPass.js";
declare const engine: Engine;

export class DrawableIndexed<R extends RenderPipeline = RenderPipeline> extends DrawableDirect<NodeIndexed> {
    #indexBuffer: IndexBuffer | undefined
    #baseVertex: number;
    #firstIndex: number;
    #GPUIndexFormat: GPUIndexFormat;
    constructor(
        drawableProps: Omit<DrawableProps<NodeIndexed>, 'label'> & {
            renderPipeline: R,
            vertexBuffers: MappedVertexBuffers<R>
        },
        drawableDirectProps?: DrawableDirectProps,
        {
            baseVertex = 0,
            firstIndex = 0,
            GPUIndexFormat = 'uint32',
        }:
            {
                baseVertex?: number;
                firstIndex?: number;
                GPUIndexFormat?: GPUIndexFormat;
            } = {}
    ) {
        super(
            {
                ...drawableProps,
                dynamicBindGroups: [[drawableProps.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu.BindGroupPosition, engine.rust.gpu_alignment(drawableProps.node.id)]]
            },
            drawableDirectProps
        );
        const indices = this.node.indices;
        if (indices.length > 0)
            this.setIndexBuffer(indices);
        this.#baseVertex = baseVertex;
        this.#firstIndex = firstIndex;
        this.#GPUIndexFormat = GPUIndexFormat
    }

    override destroy(preserveVerticeBuffers: number[] = [], preserveIndexBuffer = false): void {
        super.destroy(preserveVerticeBuffers);
        if (!preserveIndexBuffer && this.#indexBuffer) {
            this.#indexBuffer.destroy();
        }
    }

    setIndexBuffer(buffer: IndexBuffer, baseVertex?: number, destroyOld?: boolean, GPUIndexFormat?: GPUIndexFormat): IndexBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array, baseVertex?: number, destroyOld?: boolean): IndexBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array | IndexBuffer, baseVertex = 0, destroyOld = true, GPUIndexFormat?: GPUIndexFormat): IndexBuffer {
        this.#baseVertex = baseVertex;
        if (destroyOld && this.#indexBuffer) {
            this.#indexBuffer.destroy();
        }
        if (buffer instanceof Buffer) {
            this.#indexBuffer = buffer;
            if (GPUIndexFormat) {
                this.#GPUIndexFormat = GPUIndexFormat
            }
        }
        else {
            this.#indexBuffer = Buffer.create(this.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu, buffer.byteLength, [GPUBufferUsage.INDEX], 'index_' + this.node.label, b => {
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
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, renderPass: RenderPass) {
        if (this.#indexBuffer) {
            renderEncoder.setIndexBuffer(this.#indexBuffer.getIndexBuffer(renderPass), this.#GPUIndexFormat);
            const indices_count = this.node.indices_count;
            if (indices_count === 0) {
                console.warn('wont draw', this.node.label, ', zero indices')
            } else {
                console.debug('drawIndexed', this.node.label, 'indices', this.node.indices_count)
                renderEncoder.drawIndexed(this.node.indices_count, this.instanceCount, this.#firstIndex, this.#baseVertex, this.firstInstance);
            }
        } else {
            console.warn('wont draw', this.node.label, ', no indexBuffer')
        }
    }
}