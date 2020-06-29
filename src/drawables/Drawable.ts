import { GPUScene, GPUIndexBuffer, GPUVertexBuffer } from "../GPUScene";
type DrawableLike = typeof Drawable;
export interface DrawableLikeClass extends DrawableLike {
    Meshes: Set<Drawable>;
    Layouts: Map<GPUScene, GPUPipelineLayout>;
    createLayout(scene: GPUScene): GPUPipelineLayout;
};
export class Drawable {

    static BindedTerrains: Set<Drawable> = new Set();


    #renderPipeline: GPURenderPipeline;
    #indexBuffer: GPUBuffer | null = null;
    #bindGroups: Set<GPUBindGroup> |null = null;
    baseVertex: number = 0;

    private createGPUBuffer(usage: number, buffer: ArrayBuffer): GPUBuffer {
        const descriptor = { size: buffer.byteLength, usage: usage }
        if (descriptor.size == 0)
            throw ("Cannot create zero sized GPU buffer");
        let [BGPU, BARR] = this.gpuscene.device.createBufferMapped(descriptor);
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

    #vertexBuffers: Map<number, { buffer: GPUBuffer, offset: number | undefined, size: number | undefined }> = new Map();
    setVertexBuffer(index: number, buffer: ArrayBufferView, destroyOld?: boolean): GPUBuffer
    setVertexBuffer(index: number, buffer: GPUVertexBuffer, destroyOld?: boolean, offset?: number, size?: number): GPUBuffer
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
    constructor(renderPipeline: GPURenderPipelineDescriptor, bindGroups: GPUBindGroup[] | null, public indexOrVertexCount: number, public instanceCount = 1, public firstInstance = 0, public firstVertexOrIndex = 0, protected gpuscene: GPUScene = GPUScene.instance, private InstanceClass?: DrawableLikeClass ) {
        bindGroups && (this.#bindGroups = new Set(bindGroups));
        if (InstanceClass) {
            let layout = InstanceClass.Layouts.get(gpuscene)
            if (!layout) {
                layout = InstanceClass.createLayout(gpuscene);
                InstanceClass.Layouts.set(gpuscene, layout);
            }
            renderPipeline.layout = layout;
        }
        if (!renderPipeline.depthStencilState) {
            renderPipeline.depthStencilState = {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus-stencil8",
            }
        }
        this.#renderPipeline = gpuscene.device.createRenderPipeline(renderPipeline);
    }
    destroy(preserveIndexBuffer = false, preserveVerticeBuffers: number[] = []): void {
        this.#vertexBuffers.forEach((b, key) => { if (!preserveVerticeBuffers.includes(key)) b.buffer.destroy() });
        if (!preserveIndexBuffer && this.#indexBuffer)
            this.#indexBuffer.destroy();
        this.InstanceClass && this.InstanceClass.Meshes.delete(this);
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