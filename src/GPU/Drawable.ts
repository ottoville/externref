import { RenderPipeline } from "./RenderPipeline";
import type { GPU } from "../GPU";
import { RenderPass } from "./RenderPass";
type DrawableLike = typeof RenderPipeline;
interface GPUVertexReadOnlyBuffer extends GPUBuffer {
    vertex: 'true';
    storage?: 'false';
}
export interface DrawableLikeClass extends DrawableLike {
    Meshes: Set<RenderPipeline>;
    Layouts: Map<GPU, GPUPipelineLayout>;
    createLayout(scene: GPU): GPUPipelineLayout;
};


export class Drawable {
    #indexBuffer: GPUIndexBuffer | null = null;
    //Todo, support writable vertex buffer
    #vertexBuffers: Map<number, { buffer: GPUBuffer, offset: number | undefined, size: number | undefined }> = new Map();
    dynamicBuffers: Map<GPUBindGroup, number> = new Map();


    constructor(
        private renderPipeline: RenderPipeline,
        public renderPasses: Set<RenderPass>,
        public indexOrVertexCount: number,
        public baseVertex = 0,
        public instanceCount = 1,
        public firstVertexOrIndex = 0,
        public firstInstance = 0,
        private GPUIndexFormat: GPUIndexFormat = 'uint16') {

        if (instanceCount == 0)
            console.warn('Added drawable with 0 instances, nothing will be drawn')

    }
    draw(renderPass: GPURenderBundleEncoder | GPURenderPassEncoder, BindGroupsStart: number) {
        this.dynamicBuffers.forEach((offset, bindgroup) => renderPass.setBindGroup(BindGroupsStart++, bindgroup, [offset]))
        this.#vertexBuffers.forEach((buffer, index) => renderPass.setVertexBuffer(index, buffer.buffer, buffer.offset, buffer.size));
        if (this.#indexBuffer) {
            renderPass.setIndexBuffer(this.#indexBuffer, this.GPUIndexFormat);
            renderPass.drawIndexed(this.indexOrVertexCount, this.instanceCount, this.firstVertexOrIndex, this.baseVertex, this.firstInstance);
        }
        else {
            renderPass.draw(this.indexOrVertexCount, this.instanceCount, this.firstVertexOrIndex, this.firstInstance);
        }
    }
    destroy(preserveIndexBuffer = false, preserveVerticeBuffers: number[] = []): void {
        this.renderPasses.forEach(rp => {
            const variant = this.renderPipeline.variants.get(rp);
            if (variant) {
                variant.drawables.forEach(scene => scene.delete(this));
                variant.rootDrawables.delete(this);
            }
        });
        this.#vertexBuffers.forEach((b, key) => {
            if (!preserveVerticeBuffers.includes(key))
                b.buffer.destroy()
        });
        if (!preserveIndexBuffer && this.#indexBuffer)
            this.#indexBuffer.destroy();
    }
    setVertexBuffer(index: number, buffer: ArrayBufferView, destroyOld?: boolean): GPUBuffer
    setVertexBuffer(index: number, buffer: GPUVertexReadOnlyBuffer, destroyOld?: boolean, offset?: number, size?: number): GPUBuffer
    setVertexBuffer(index: number, buffer: ArrayBufferView | GPUVertexBuffer, destroyOld = true, offset?: number, size?: number): GPUBuffer {
        if (destroyOld) {
            let Tbuffer = this.#vertexBuffers.get(index);
            Tbuffer && Tbuffer.buffer.destroy();
        }
        if (buffer instanceof GPUBuffer)
            var Tbuffer = buffer;
        else {
            var Tbuffer = this.renderPipeline.bindgroupdrawable.gpuscene.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.VERTEX], true)
            new Uint8Array(Tbuffer.getMappedRange()).set(new Uint8Array(buffer.buffer));
            Tbuffer.unmap();
        }
        this.#vertexBuffers.set(index, { buffer: Tbuffer, offset, size });
        return Tbuffer;
    }
    setIndexBuffer(buffer: GPUIndexBuffer, baseVertex?: number, destroyOld?: boolean, GPUIndexFormat?: GPUIndexFormat): GPUBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array, baseVertex?: number, destroyOld?: boolean): GPUBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array | GPUIndexBuffer, baseVertex = 0, destroyOld = true, GPUIndexFormat?: GPUIndexFormat): GPUBuffer {
        this.baseVertex = baseVertex;
        destroyOld && this.#indexBuffer && this.#indexBuffer.destroy();
        if (buffer instanceof GPUBuffer) {
            this.#indexBuffer = buffer;
            GPUIndexFormat && (this.GPUIndexFormat = GPUIndexFormat);
        }
        else {
            this.#indexBuffer = this.renderPipeline.bindgroupdrawable.gpuscene.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.INDEX], true);
            if (buffer.BYTES_PER_ELEMENT == 4) {
                new Uint32Array(this.#indexBuffer.getMappedRange()).set(buffer);
                this.GPUIndexFormat = 'uint32';
            } else {
                new Uint16Array(this.#indexBuffer.getMappedRange()).set(buffer);
                this.GPUIndexFormat = 'uint16';
            }
            this.#indexBuffer.unmap();
        }
        return this.#indexBuffer;
    }
}