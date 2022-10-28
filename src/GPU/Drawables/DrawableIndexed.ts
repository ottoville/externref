import type { RenderPipeline } from "../RenderPipeline.js";
import type { RenderPass } from "../RenderPasses/RenderPass.js";
import { GPUBufferUsage } from "../../GPU.js"
import type { IndexedNode } from "../../nodes/DataNode.js";
import { Buffer, type IndexBuffer } from "../Buffer.js";
import type { Engine } from "../../engine.js";
import { DrawableDirect } from "./DrawableDirect.js";
declare const engine: Engine;

export class DrawableIndexed extends DrawableDirect {
    constructor(
        renderPipeline: RenderPipeline,
        protected node: IndexedNode,
        renderPasses?: Set<RenderPass>,
        private indexBuffer?: IndexBuffer,
        public baseVertex = 0,
        instanceCount = 1,
        public firstIndex = 0,
        public firstInstance = 0,
        private GPUIndexFormat: GPUIndexFormat = 'uint16',
    ) {
        super(renderPipeline, [[renderPipeline.bindgroupdrawable.bindGroupLayout.gpu.BindGroupPosition, engine.rust.gpu_alignment(node.ptr)]], node.label, renderPasses, instanceCount);
    }

    override destroy(preserveVerticeBuffers: number[] = [], preserveIndexBuffer = false): void {
        super.destroy(preserveVerticeBuffers);
        if (!preserveIndexBuffer && this.indexBuffer)
            this.indexBuffer.destroy();
    }
    setIndexBuffer(buffer: IndexBuffer, baseVertex?: number, destroyOld?: boolean, GPUIndexFormat?: GPUIndexFormat): IndexBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array, baseVertex?: number, destroyOld?: boolean): IndexBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array | IndexBuffer, baseVertex = 0, destroyOld = true, GPUIndexFormat?: GPUIndexFormat): IndexBuffer {
        this.baseVertex = baseVertex;
        if (destroyOld && this.indexBuffer) {
            this.indexBuffer.destroy();
            this.clearBundles();
        }
        if (buffer instanceof Buffer) {
            this.indexBuffer = buffer;
            GPUIndexFormat && (this.GPUIndexFormat = GPUIndexFormat);
        }
        else {
            this.indexBuffer = Buffer.create(this.renderPipeline.bindgroupdrawable.bindGroupLayout.gpu, buffer.byteLength, [GPUBufferUsage.INDEX], 'index_' + this.label, b => {
                if (buffer.BYTES_PER_ELEMENT == 4) {
                    new Uint32Array(b.getMappedRange()).set(buffer);
                    this.GPUIndexFormat = 'uint32';
                } else {
                    new Uint16Array(b.getMappedRange()).set(buffer);
                    this.GPUIndexFormat = 'uint16';
                }
            });

        }
        return this.indexBuffer;
    }
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        if (this.indexBuffer) {
            renderEncoder.setIndexBuffer(this.indexBuffer.indexBuffer, this.GPUIndexFormat);
            renderEncoder.drawIndexed(this.node.indices_count ?? 0, this.instanceCount, this.firstIndex, this.baseVertex, this.firstInstance);
        }
    }
}