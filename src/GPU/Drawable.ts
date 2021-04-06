import type { RenderPipeline } from "./RenderPipeline.js";
import type { GPU } from "../GPU.js";
import type { RenderPass } from "./RenderPass.js";
import type { Scene } from "../Scene.js";
import { TerraNodeGPU } from "../TerraNode.js";
type DrawableLike = typeof RenderPipeline;
export interface DrawableLikeClass extends DrawableLike {
    Meshes: Set<RenderPipeline>;
    Layouts: Map<GPU, GPUPipelineLayout>;
    createLayout(scene: GPU): GPUPipelineLayout;
};

export abstract class Drawable {
    #vertexBuffers: Map<number, { buffer: GPUBuffer, offset: number | undefined, size: number | undefined }> = new Map();
    dynamicBuffers: Map<GPUBindGroup, number> = new Map();
    //staticBuffers?: () => GPUBindGroup
    #staticBufferArray: (GPUSampler | GPUTextureView)[] = [];
    #renderList: Map<RenderPass<{}>, Set<Drawable>> = new Map();
    #scene?: Scene;
    constructor(
        protected renderPipeline: RenderPipeline,
        private renderPasses: Set<RenderPass<{}>>,
        scene?: Scene) {
        this.scene = scene;
        this.clearBundles();
    }

    set scene(scene: Scene | undefined) {
        if (this.#scene) {
            this.#renderList.forEach(Drawables => Drawables.delete(this));
        }
        this.#scene = scene;
        this.renderPasses.forEach(rp => {

            let variant = rp.renderPipelines.get(this.renderPipeline)
            if (!variant) {
                const renderpipeline = rp.decoratePipeline(this.renderPipeline);
                variant = {
                    renderpipeline: renderpipeline,
                    drawables: new Map(),
                    rootDrawables: new Set()
                }
                rp.renderPipelines.set(this.renderPipeline, variant)
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
    get staticBuffers() {
        return this.renderPipeline.bindgroupdrawable.gpuscene.device.createBindGroup(
            {
                layout: this.renderPipeline.bindgroupdrawable.bindGroupLayout,
                entries: this.#staticBufferArray.map((resource, binding) => {
                    return {
                        binding,
                        resource
                    }
                })
            })
    }
    setStaticBuffer(...staticBuffers:(GPUSampler | GPUTextureView)[]) {
        this.#staticBufferArray=staticBuffers;
        this.clearBundles();
    }
    protected clearBundles() {
        this.renderPasses.forEach(rp => rp.bundles.length = 0);
    }
    destroy(preserveVerticeBuffers: number[] = []): void {
        this.#renderList.forEach(Drawables => Drawables.delete(this));
        this.clearBundles();
        this.#vertexBuffers.forEach((b, key) => {
            if (!preserveVerticeBuffers.includes(key))
                b.buffer.destroy()
        });
    }
    setVertexBuffer(index: number, buffer: ArrayBufferView, destroyOld?: boolean): GPUVertexBuffer
    setVertexBuffer<T extends GPUVertexBuffer>(index: number, buffer: T, destroyOld?: boolean, offset?: number, size?: number): T
    setVertexBuffer(index: number, buffer: ArrayBufferView | GPUVertexBuffer, destroyOld = true, offset?: number, size?: number): GPUVertexBuffer {
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
        this.#staticBufferArray.length && renderPass.setBindGroup(BindGroupsStart++, this.staticBuffers)
        //this.#staticBuffers.forEach((bindgroup) => renderPass.setBindGroup(BindGroupsStart++, bindgroup()));
        this.dynamicBuffers.forEach((offset, bindgroup) => {
            renderPass.setBindGroup(BindGroupsStart++, bindgroup, [offset * TerraNodeGPU.alignment]);
        })
        this.#vertexBuffers.forEach((buffer, index) => renderPass.setVertexBuffer(index, buffer.buffer, buffer.offset, buffer.size));
        this.render(renderPass);
    }
}
export abstract class DrawableDirect extends Drawable {
    #instanceCount: number;
    constructor(
        renderPipeline: RenderPipeline,
        renderPasses: Set<RenderPass<{}>>,
        public node: TerraNodeGPU<DrawableDirect>,
        scene?: Scene,
        instanceCount = 1) {

        super(renderPipeline, renderPasses, scene);
        if (instanceCount == 0)
            console.warn('Added drawable with 0 instances, nothing will be drawn');
        this.#instanceCount = instanceCount;
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
}
export class DrawableIndirect<T extends GPUIndirectBuffer> extends Drawable {
    constructor(
        renderPipeline: RenderPipeline,
        renderPasses: Set<RenderPass<{}>>,
        readonly buffer: T,
        scene?: Scene,) {
        super(renderPipeline, renderPasses, scene);
    }
    render = (renderPass: GPURenderBundleEncoder | GPURenderPassEncoder) => {
        renderPass.drawIndirect(this.buffer, 0);
    }
}
export class DrawableSimple extends DrawableDirect {
    constructor(
        renderPipeline: RenderPipeline,
        renderPasses: Set<RenderPass<{}>>,
        node: TerraNodeGPU<DrawableSimple>,
        scene?: Scene,
        instanceCount = 1,
        public firstVertex = 0,
        public firstInstance = 0) {
        super(renderPipeline, renderPasses, node, scene, instanceCount);
    }
    render = (renderPass: GPURenderBundleEncoder | GPURenderPassEncoder) => {
        renderPass.draw(this.node.verticesCount, this.instanceCount, this.firstVertex, this.firstInstance);
    }
}
export class DrawableIndexed extends DrawableDirect {
    constructor(
        renderPipeline: RenderPipeline,
        renderPasses: Set<RenderPass<{}>>,
        node: TerraNodeGPU<DrawableIndexed>,
        private indexBuffer?: GPUIndexBuffer,
        scene?: Scene,
        public baseVertex = 0,
        instanceCount = 1,
        public firstIndex = 0,
        public firstInstance = 0,
        private GPUIndexFormat: GPUIndexFormat = 'uint16') {
        super(renderPipeline, renderPasses, node, scene, instanceCount);
    }
    destroy(preserveVerticeBuffers: number[] = [], preserveIndexBuffer = false): void {
        super.destroy(preserveVerticeBuffers);
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
            renderPass.drawIndexed(this.node.verticesCount, this.instanceCount, this.firstIndex, this.baseVertex, this.firstInstance);
        }
    }
}