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

export abstract class Drawable {
    #vertexBuffers: Map<number, { buffer: GPUBuffer, offset: number | undefined, size: number | undefined }> = new Map();
    dynamicBuffers: Map<GPUBindGroup, number> = new Map();
    #staticBuffers: Set<GPUBindGroup> = new Set()
    #renderList: Map<RenderPass, Set<Drawable>> = new Map();
    #scene?: Scene;
    #instanceCount: number;
    constructor(
        protected renderPipeline: RenderPipeline,
        private renderPasses: Set<RenderPass>,
        instanceCount:number,
        scene?: Scene) {
        if (instanceCount == 0)
            console.warn('Added drawable with 0 instances, nothing will be drawn');
        this.#instanceCount = instanceCount;
        this.scene = scene;
        this.clearBundles();
    }
    set instanceCount(count: number) {
        if (count === this.#instanceCount)
            return;
        this.#instanceCount = count;
        this.clearBundles();
    }
    get instanceCount() {
        return this.#instanceCount;
    }
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
        this.clearBundles();
    }
    setStaticBuffer(setBuffers: () => GPUBindGroupEntry[]) {
        const setBuffer = () => {
            this.#staticBuffers = new Set([this.renderPipeline.bindgroupdrawable.gpuscene.device.createBindGroup(
                {
                    layout: this.renderPipeline.bindgroupdrawable.bindGroupLayout,
                    entries: setBuffers()
                }
            )]);
            this.clearBundles();
        }
        this.renderPipeline.bindgroupdrawable.gpuscene.onResizes.add(() => {
            setBuffer();
        });
        setBuffer();
    }
    protected clearBundles() {
        this.renderPasses.forEach(rp => rp.bundles.length = 0);
    }
    destroy(preserveIndexBuffer = false, preserveVerticeBuffers: number[] = []): void {
        this.#renderList.forEach(Drawables => Drawables.delete(this));
        this.clearBundles();
        this.#vertexBuffers.forEach((b, key) => {
            if (!preserveVerticeBuffers.includes(key))
                b.buffer.destroy()
        });
    }
    setVertexBuffer(index: number, buffer: ArrayBufferView, destroyOld?: boolean): GPUBuffer
    setVertexBuffer(index: number, buffer: GPUVertexReadOnlyBuffer, destroyOld?: boolean, offset?: number, size?: number): GPUBuffer
    setVertexBuffer(index: number, buffer: ArrayBufferView | GPUVertexBuffer, destroyOld = true, offset?: number, size?: number): GPUBuffer {
        if (destroyOld) {
            let Tbuffer = this.#vertexBuffers.get(index);
            if (Tbuffer) {
                Tbuffer.buffer.destroy();
                this.clearBundles();
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
    abstract render: (renderPass: GPURenderBundleEncoder | GPURenderPassEncoder) => void
    draw(renderPass: GPURenderBundleEncoder | GPURenderPassEncoder, BindGroupsStart: number) {
        this.#staticBuffers.forEach((bindgroup) => renderPass.setBindGroup(BindGroupsStart++, bindgroup));
        this.dynamicBuffers.forEach((offset, bindgroup) => {
            renderPass.setBindGroup(BindGroupsStart++, bindgroup, [offset]);
        })
        this.#vertexBuffers.forEach((buffer, index) => renderPass.setVertexBuffer(index, buffer.buffer, buffer.offset, buffer.size));
        this.render(renderPass);
    }
}
export class DrawableSimple extends Drawable{
    constructor(
        renderPipeline: RenderPipeline,
        renderPasses: Set<RenderPass>,
        public vertexCount: number,
        scene?: Scene,
        instanceCount = 1,
        public firstVertex = 0,
        public firstInstance = 0) {
            super(renderPipeline, renderPasses, instanceCount, scene);
    }
    render = (renderPass: GPURenderBundleEncoder | GPURenderPassEncoder) => {
        renderPass.draw(this.vertexCount, this.instanceCount, this.firstVertex, this.firstInstance);
    }
}
export class DrawableIndexed extends Drawable{
    constructor(
        renderPipeline: RenderPipeline,
        renderPasses: Set<RenderPass>,
        public indexCount: number,
        private indexBuffer?: GPUIndexBuffer,
        scene?: Scene,
        public baseVertex = 0,
        instanceCount = 1,
        public firstIndex = 0,
        public firstInstance = 0,
        private GPUIndexFormat: GPUIndexFormat = 'uint16') {
            super(renderPipeline, renderPasses, instanceCount, scene);
    }
    destroy(preserveIndexBuffer = false, preserveVerticeBuffers: number[] = []): void {
        super.destroy();
        if (!preserveIndexBuffer && this.indexBuffer)
            this.indexBuffer.destroy();
    }
    setIndexBuffer(buffer: GPUIndexBuffer, baseVertex?: number, destroyOld?: boolean, GPUIndexFormat?: GPUIndexFormat): GPUBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array, baseVertex?: number, destroyOld?: boolean): GPUBuffer
    setIndexBuffer(buffer: Uint16Array | Uint32Array | GPUIndexBuffer, baseVertex = 0, destroyOld = true, GPUIndexFormat?: GPUIndexFormat): GPUBuffer {
        this.baseVertex = baseVertex;
        if (destroyOld && this.indexBuffer) {
            this.indexBuffer.destroy();
            this.clearBundles();
        }
        if (buffer instanceof GPUBuffer) {
            this.indexBuffer = buffer;
            GPUIndexFormat && (this.GPUIndexFormat = GPUIndexFormat);
        }
        else {
            this.indexBuffer = this.renderPipeline.bindgroupdrawable.gpuscene.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.INDEX], true);
            if (buffer.BYTES_PER_ELEMENT == 4) {
                new Uint32Array(this.indexBuffer.getMappedRange()).set(buffer);
                this.GPUIndexFormat = 'uint32';
            } else {
                new Uint16Array(this.indexBuffer.getMappedRange()).set(buffer);
                this.GPUIndexFormat = 'uint16';
            }
            this.indexBuffer.unmap();
        }
        return this.indexBuffer;
    }
    render = (renderPass: GPURenderBundleEncoder | GPURenderPassEncoder) => {
        if (this.indexBuffer) {
            renderPass.setIndexBuffer(this.indexBuffer, this.GPUIndexFormat);
            renderPass.drawIndexed(this.indexCount, this.instanceCount, this.firstIndex, this.baseVertex, this.firstInstance);
        }
    }
}