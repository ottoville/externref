import type { GPUScene, GroupDrawable } from "../GPUScene";
type DrawableLike = typeof RenderPipeLine;
interface GPUVertexReadOnlyBuffer extends GPUBuffer {
    vertex: 'true';
    storage?: 'false';
}
export interface DrawableLikeClass extends DrawableLike {
    Meshes: Set<RenderPipeLine>;
    Layouts: Map<GPUScene, GPUPipelineLayout>;
    createLayout(scene: GPUScene): GPUPipelineLayout;
};
export class RenderPipeLine {

    static BindedTerrains: Set<RenderPipeLine> = new Set();

    properties: number = 0;

    useTime = true;

    renderPipeline: GPURenderPipeline;
    #indexBuffer: GPUBuffer | null = null;
    dynamicBindGroupOffset: number[] = [];
    bindGroups: Set<GPUBindGroup> | null = null;
    baseVertex: number = 0;
    #GPUIndexFormat: GPUIndexFormat = 'uint16';

    setIndexBuffer(buffer: GPUIndexBuffer, baseVertex?: number, destroyOld?: boolean, GPUIndexFormat?: GPUIndexFormat): GPUBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array, baseVertex?: number, destroyOld?: boolean): GPUBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array | GPUIndexBuffer, baseVertex = 0, destroyOld = true, GPUIndexFormat?: GPUIndexFormat): GPUBuffer {
        this.baseVertex = baseVertex;
        destroyOld && this.#indexBuffer && this.#indexBuffer.destroy();
        if (buffer instanceof GPUBuffer) {
            this.#indexBuffer = buffer;
            GPUIndexFormat && (this.#GPUIndexFormat = GPUIndexFormat);
        }
        else {
          //  console.log('create buffer ', buffer.byteLength)
            this.#indexBuffer = this.bindgroupdrawable.gpuscene.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.INDEX], true);
            if (buffer.BYTES_PER_ELEMENT == 4) {
                new Uint32Array(this.#indexBuffer.getMappedRange()).set(buffer);
                this.#GPUIndexFormat = 'uint32';
            } else {
                new Uint16Array(this.#indexBuffer.getMappedRange()).set(buffer);
                this.#GPUIndexFormat = 'uint16';
            }
            this.#indexBuffer.unmap();
        }
        return this.#indexBuffer;
    }
    //Todo, support writable vertex buffer
    #vertexBuffers: Map<number, { buffer: GPUBuffer, offset: number | undefined, size: number | undefined }> = new Map();
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
            var Tbuffer = this.bindgroupdrawable.gpuscene.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.VERTEX], true) //this.createGPUBuffer(GPUBufferUsage.VERTEX, buffer.buffer) as GPUVertexBuffer;
            new Uint8Array(Tbuffer.getMappedRange()).set(new Uint8Array(buffer.buffer));
            Tbuffer.unmap();
        }
        this.#vertexBuffers.set(index, {buffer: Tbuffer, offset, size });
        return Tbuffer;
    }
    constructor(renderPipeline: GPURenderPipelineDescriptor, public indexOrVertexCount: number, public instanceCount = 1, public firstInstance = 0, public firstVertexOrIndex = 0, private bindgroupdrawable: GroupDrawable) {
        renderPipeline.layout = bindgroupdrawable.layout;
        renderPipeline.vertexState && renderPipeline.vertexState.indexFormat && (this.#GPUIndexFormat = renderPipeline.vertexState.indexFormat);
        if (!renderPipeline.rasterizationState) {
            renderPipeline.rasterizationState = {
                cullMode: 'back',
            }
        }
        if (!renderPipeline.depthStencilState) {
            renderPipeline.depthStencilState = {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus-stencil8",
            }
        }
        this.renderPipeline = bindgroupdrawable.gpuscene.device.createRenderPipeline(renderPipeline);
    }
    destroy(preserveIndexBuffer = false, preserveVerticeBuffers: number[] = []): void {
        this.#vertexBuffers.forEach((b, key) => { if (!preserveVerticeBuffers.includes(key)) b.buffer.destroy() });
        if (!preserveIndexBuffer && this.#indexBuffer)
            this.#indexBuffer.destroy();
        this.bindgroupdrawable.meshes.delete(this);
    }
    draw(renderPass: GPURenderBundleEncoder | GPURenderPassEncoder, BindGroupsStart: number): void {

        

        renderPass.setPipeline(this.renderPipeline);
       // this.#drawables.forEach(drawable => drawable.draw(renderPass));

        this.#vertexBuffers.forEach((buffer, index) => renderPass.setVertexBuffer(index, buffer.buffer, buffer.offset, buffer.size));
        if (this.bindGroups) {
            this.bindGroups.forEach(bindgroup => renderPass.setBindGroup(BindGroupsStart++, bindgroup));
        }
        if (this.#indexBuffer) {
            renderPass.setIndexBuffer(this.#indexBuffer, this.#GPUIndexFormat);
            renderPass.drawIndexed(this.indexOrVertexCount, this.instanceCount, this.firstVertexOrIndex, this.baseVertex, this.firstInstance);
        }
        else {
            renderPass.draw(this.indexOrVertexCount, this.instanceCount, this.firstVertexOrIndex, this.firstInstance);
        }
    }
    #drawables: Set<Drawable> = new Set();
    addDrawable(indexOrVertexCount: number, baseVertex: number = 0, instanceCount = 1, firstVertexOrIndex = 0, firstInstance = 0): Drawable {
        const d = new Drawable(this.bindgroupdrawable.gpuscene, indexOrVertexCount, baseVertex, instanceCount, firstVertexOrIndex, firstInstance);
        this.#drawables.add(d)
        return d;
    }
}

class Drawable {
    #indexBuffer: GPUBuffer | null = null;
    #GPUIndexFormat: GPUIndexFormat = 'uint16';
    constructor(public gpuscene:GPUScene, public indexOrVertexCount: number, public baseVertex = 0, public instanceCount = 1, public firstVertexOrIndex = 0, public firstInstance = 0) {

    }
    draw(renderPass: GPURenderBundleEncoder | GPURenderPassEncoder) {
        this.#vertexBuffers.forEach((buffer, index) => renderPass.setVertexBuffer(index, buffer.buffer, buffer.offset, buffer.size));
        if (this.#indexBuffer) {
            renderPass.setIndexBuffer(this.#indexBuffer, this.#GPUIndexFormat);
            renderPass.drawIndexed(this.indexOrVertexCount, this.instanceCount, this.firstVertexOrIndex, this.baseVertex, this.firstInstance);
        }
        else {
            renderPass.draw(this.indexOrVertexCount, this.instanceCount, this.firstVertexOrIndex, this.firstInstance);
        }
    }
    //Todo, support writable vertex buffer
    #vertexBuffers: Map<number, { buffer: GPUBuffer, offset: number | undefined, size: number | undefined }> = new Map();
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
            var Tbuffer = this.gpuscene.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.VERTEX], true)
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
            GPUIndexFormat && (this.#GPUIndexFormat = GPUIndexFormat);
        }
        else {
            this.#indexBuffer = this.gpuscene.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.INDEX], true);
            if (buffer.BYTES_PER_ELEMENT == 4) {
                new Uint32Array(this.#indexBuffer.getMappedRange()).set(buffer);
                this.#GPUIndexFormat = 'uint32';
            } else {
                new Uint16Array(this.#indexBuffer.getMappedRange()).set(buffer);
                this.#GPUIndexFormat = 'uint16';
            }
            this.#indexBuffer.unmap();
        }
        return this.#indexBuffer;
    }
}