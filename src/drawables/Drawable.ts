import type { GPUScene, GPUIndexBuffer, GPUVertexBuffer, BindGroupDrawable } from "../GPUScene";
type DrawableLike = typeof Drawable;
interface GPUVertexReadOnlyBuffer extends GPUBuffer {
    vertex: 'true';
    storage?: 'false';
}
export interface DrawableLikeClass extends DrawableLike {
    Meshes: Set<Drawable>;
    Layouts: Map<GPUScene, GPUPipelineLayout>;
    createLayout(scene: GPUScene): GPUPipelineLayout;
};
export class Drawable {

    static BindedTerrains: Set<Drawable> = new Set();

    useTime = true;

    #renderPipeline: GPURenderPipeline;
    #indexBuffer: GPUBuffer | null = null;
    #bindGroups: Set<GPUBindGroup> |null = null;
    baseVertex: number = 0;

    private createGPUBuffer(usage: number, buffer: ArrayBuffer): GPUBuffer {
        const descriptor = { size: buffer.byteLength, usage: usage }
        if (descriptor.size == 0)
            throw ("Cannot create zero sized GPU buffer");
        let [BGPU, BARR] = this.bindgroupdrawable.gpuscene.device.createBufferMapped(descriptor);
        new Uint8Array(BARR).set(new Uint8Array(buffer));
        BGPU.unmap();
        return BGPU;
    }
    setIndexBuffer(buffer: ArrayBufferView | GPUIndexBuffer, baseVertex = 0, destroyOld = true) : GPUBuffer {
        this.baseVertex = baseVertex;
        destroyOld && this.#indexBuffer && this.#indexBuffer.destroy
        if (buffer instanceof GPUBuffer)
            this.#indexBuffer = buffer;
        else
            this.#indexBuffer = this.createGPUBuffer(GPUBufferUsage.INDEX, buffer.buffer);
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
        else
            var Tbuffer = this.createGPUBuffer(GPUBufferUsage.VERTEX, buffer.buffer) as GPUVertexBuffer;
        this.#vertexBuffers.set(index, {buffer: Tbuffer, offset, size });
        return Tbuffer;
    }
    BindGroupsStart: number = 2;
    constructor(renderPipeline: GPURenderPipelineDescriptor, bindGroups: GPUBindGroup[] | null, public indexOrVertexCount: number, public instanceCount = 1, public firstInstance = 0, public firstVertexOrIndex = 0, private bindgroupdrawable: BindGroupDrawable) {
        bindGroups && (this.#bindGroups = new Set(bindGroups));
        renderPipeline.layout = bindgroupdrawable.layout;
        if (!renderPipeline.depthStencilState) {
            renderPipeline.depthStencilState = {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus-stencil8",
            }
        }
        this.#renderPipeline = bindgroupdrawable.gpuscene.device.createRenderPipeline(renderPipeline);
    }
    destroy(preserveIndexBuffer = false, preserveVerticeBuffers: number[] = []): void {
        this.#vertexBuffers.forEach((b, key) => { if (!preserveVerticeBuffers.includes(key)) b.buffer.destroy() });
        if (!preserveIndexBuffer && this.#indexBuffer)
            this.#indexBuffer.destroy();
        this.bindgroupdrawable.meshes.delete(this);
    }
    draw(renderPass: GPURenderBundleEncoder | GPURenderPassEncoder): void {
        renderPass.setPipeline(this.#renderPipeline);
        this.#vertexBuffers.forEach((buffer, index) => renderPass.setVertexBuffer(index, buffer.buffer, buffer.offset, buffer.size));
        if (this.#bindGroups) {
            let key = this.BindGroupsStart;
            this.#bindGroups.forEach(bindgroup => renderPass.setBindGroup(key++, bindgroup));
        }
        if (this.#indexBuffer) {
            renderPass.setIndexBuffer(this.#indexBuffer, 0);
            renderPass.drawIndexed(this.indexOrVertexCount, this.instanceCount, this.firstVertexOrIndex, this.baseVertex, this.firstInstance);
        }
        else {
            renderPass.draw(this.indexOrVertexCount, this.instanceCount, this.firstVertexOrIndex, this.firstInstance);
        }
    }
}