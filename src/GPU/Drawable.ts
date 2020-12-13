import { RenderPipeline } from "./RenderPipeline";
import type { GPU } from "../GPU";
import { RenderPass } from "./RenderPass";
import { Scene } from "../Scene";
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
    setStaticBuffer(setBuffers: () => GPUBindGroupEntry[]) {
        const setBuffer = () => {
            this.staticBuffers = new Set([this.renderPipeline.bindgroupdrawable.gpuscene.device.createBindGroup(
                {
                    layout: this.renderPipeline.bindgroupdrawable.bindGroupLayout,
                    entries: setBuffers()
                }
            )]);
            this.renderPasses.forEach(rp => rp.bundles.length = 0);
        }
        this.renderPipeline.bindgroupdrawable.gpuscene.onResizes.add(() => {
            setBuffer();
        });
        setBuffer();
    }
    #indexBuffer: GPUIndexBuffer | null = null;
    //Todo, support writable vertex buffer
    #vertexBuffers: Map<number, { buffer: GPUBuffer, offset: number | undefined, size: number | undefined }> = new Map();
    dynamicBuffers: Map<GPUBindGroup, number> = new Map();
    staticBuffers: Set<GPUBindGroup>=new Set()
    #renderList: Map<RenderPass, Set<Drawable>> = new Map();
    #scene?: Scene;
    set scene(scene: Scene | undefined) {
        if (this.#scene) {
            this.#renderList.forEach(Drawables => Drawables.delete(this));
        }
        this.#scene = scene;
        this.renderPasses.forEach(rp => {
            let variant = this.renderPipeline.variants.get(rp);
            if (!variant) {
                const renderpipeline = this.renderPipeline.bindgroupdrawable.gpuscene.device.createRenderPipeline(rp.decoratePipeline(this.renderPipeline.renderPipelineDescriptor));
                variant = {
                    renderPass: rp,
                    renderpipeline: renderpipeline,
                    drawables: new Map(),
                    rootDrawables: new Set()
                }
                this.renderPipeline.variants.set(rp, variant)
            }
            if (scene) {
                let sceneDrawables = variant.drawables.get(scene);
                if (!sceneDrawables) {
                    sceneDrawables = new Set()
                    variant.drawables.set(scene, sceneDrawables);
                }
                this.#renderList.set(rp, sceneDrawables.add(this));
            } else
                this.#renderList.set(rp, variant.rootDrawables.add(this));
        });
        this.renderPasses.forEach(rp => rp.bundles.length = 0);
    }
    constructor(
        private renderPipeline: RenderPipeline,
        private renderPasses: Set<RenderPass>,
        public indexOrVertexCount: number,
        scene?: Scene,
        public baseVertex = 0,
        public instanceCount = 1,
        public firstVertexOrIndex = 0,
        public firstInstance = 0,
        private GPUIndexFormat: GPUIndexFormat = 'uint16') {
            if (instanceCount == 0)
                console.warn('Added drawable with 0 instances, nothing will be drawn');
        this.scene = scene;
        renderPasses.forEach(rp => rp.bundles.length = 0);
    }
    draw(renderPass: GPURenderBundleEncoder | GPURenderPassEncoder, BindGroupsStart: number) {
        this.staticBuffers.forEach((bindgroup) => renderPass.setBindGroup(BindGroupsStart++, bindgroup));
        this.dynamicBuffers.forEach((offset, bindgroup) => {
            renderPass.setBindGroup(BindGroupsStart++, bindgroup, [offset]);
        })
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
        this.#renderList.forEach(Drawables => Drawables.delete(this));
        this.renderPasses.forEach(rp => rp.bundles.length = 0);
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
            if (Tbuffer) {
                Tbuffer.buffer.destroy();
                this.renderPasses.forEach(rp => rp.bundles.length = 0);
            }
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
        if (destroyOld && this.#indexBuffer) {
            this.#indexBuffer.destroy();
            this.renderPasses.forEach(rp => rp.bundles.length = 0);
        }
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