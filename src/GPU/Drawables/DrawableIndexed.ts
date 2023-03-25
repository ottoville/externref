import { Buffer, type IndexBuffer, GPUBufferUsage } from "../Buffer/Buffer.js";
import type { Engine } from "../../engine.js";
import { DrawableDirect, type MappedVertexBuffers } from "./DrawableDirect.js";
import { NodeIndexed } from "../../nodes/NodeIndexed.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import { DrawableProps } from "./Drawable.js";
declare const engine: Engine;

export class DrawableIndexed<R extends RenderPipeline = RenderPipeline> extends DrawableDirect {
    node: NodeIndexed;
    #indexBuffer: IndexBuffer | undefined
    #baseVertex: number;
    #firstIndex: number;
    #firstInstance: number;
    #GPUIndexFormat: GPUIndexFormat;
    constructor(
        drawableProps: Omit<DrawableProps, 'label'> & {
            renderPipeline: R,
            vertexBuffers: MappedVertexBuffers<R>
        },
        {
            node,
            indexBuffer,
            baseVertex = 0,
            instanceCount = 1,
            firstIndex = 0,
            firstInstance = 0,
            GPUIndexFormat = 'uint16',
        }:
            {
                node: NodeIndexed;
                indexBuffer?: IndexBuffer;
                baseVertex?: number;
                instanceCount?: number;
                firstIndex?: number;
                firstInstance?: number;
                GPUIndexFormat?: GPUIndexFormat;
            }
    ) {
        super(
            {
                ...drawableProps,
                label: node.label,
                dynamicBindGroups: [[drawableProps.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu.BindGroupPosition, engine.rust.gpu_alignment(node.id)]]
            },
            {
                instanceCount,
            }
        );
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
            if (GPUIndexFormat) {
                this.#GPUIndexFormat = GPUIndexFormat
            }
        }
        else {
            this.#indexBuffer = Buffer.create(this.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu, buffer.byteLength, [GPUBufferUsage.INDEX], 'index_' + this.label, b => {
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
            const indices_count = this.node.indices_count;
            if (indices_count === 0) {
                console.warn('wont draw', this.label, ', zero indices')
            } else {
                console.debug('drawIndexed', this.label, 'indices', this.node.indices_count)
                renderEncoder.drawIndexed(this.node.indices_count, this.instanceCount, this.#firstIndex, this.#baseVertex, this.#firstInstance);
            }
        } else {
            console.warn('wont draw', this.label, ', no indexBuffer')
        }
    }
}