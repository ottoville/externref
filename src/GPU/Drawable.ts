import { RenderPipeline } from "./RenderPipeline.js";
import type { RenderPass } from "./RenderPass.js";
import { MainNode } from "../MainNode.js";
import { GPUBufferUsage } from "../GPU.js"
import type { DataNode, IndexedNode } from "../DataNode.js";
import { NormalsMesh } from "./RenderPipeLines/helpers/normals.js";
import { BoundingBoxMesh } from "./RenderPipeLines/helpers/boundingbox.js";

import type { Engine } from "../engine.js";
declare const engine:Engine;


export abstract class Drawable {
    abstract label:string;
    #vertexBuffers: Map<number, { buffer: GPUBuffer, offset: number | undefined, size: number | undefined }> = new Map();
    protected dynamicBuffers: [GPUBindGroup, number][] = [];
    #renderList: Map<RenderPass, Set<Drawable>> = new Map();
    constructor(
        protected renderPipeline: Readonly<RenderPipeline>,
        private renderPasses: Set<RenderPass> = new Set([engine.gpu.renderPassScreen])) {
            this.renderPasses.forEach(rp => {
                const variant = rp.getVariant(this.renderPipeline);
                this.#renderList.set(rp, variant.rootDrawables.add(this));
            });
            this.clearBundles();
    }

    staticBuffers?:GPUBindGroup;
    setStaticBuffer(...staticBuffers:(GPUSampler | GPUTextureView)[]) {
        this.clearBundles();
        this.staticBuffers= this.renderPipeline.bindgroupdrawable.gpu.device.createBindGroup(
            {
                layout: this.renderPipeline.bindgroupdrawable.bindGroupLayout.layout,
                entries: staticBuffers.map((resource, binding) => {
                    return {
                        binding,
                        resource
                    }
                })
            })
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
            const Tbuffer = this.#vertexBuffers.get(index);
            if (Tbuffer) {
                Tbuffer.buffer.destroy();
                this.clearBundles();
            }
        }
        if (buffer instanceof GPUBuffer)
            var Tbuffer = buffer;
        else {
            var Tbuffer = this.renderPipeline.bindgroupdrawable.gpu.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.VERTEX], true)
            new Uint8Array(Tbuffer.getMappedRange()).set(new Uint8Array(buffer.buffer));
            Tbuffer.unmap();
        }
        this.#vertexBuffers.set(index, { buffer: Tbuffer, offset, size });
        return Tbuffer;
    }
    abstract render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) : void
    draw(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, BindGroupsStart: number, dynamicIndex:number[]) {
        this.dynamicBuffers.forEach((gpubindgroup_offset, i) => {
            const di=dynamicIndex[i];
            if(di) {
                renderEncoder.setBindGroup(di, gpubindgroup_offset[0], [this.renderPipeline.bindgroupdrawable.gpu.gpu_memory_index_size + gpubindgroup_offset[1] * MainNode.alignment]);
            }
        });
        this.staticBuffers && renderEncoder.setBindGroup(BindGroupsStart++, this.staticBuffers)

        this.#vertexBuffers.forEach((buffer, index) => renderEncoder.setVertexBuffer(index, buffer.buffer, buffer.offset, buffer.size));
        this.render(renderEncoder);
    }
}
abstract class DrawableDirect extends Drawable {
    #instanceCount: number;
    abstract node: MainNode

    constructor(
        renderPipeline: RenderPipeline,
        dynamicIndex: number,
        public label:string,
        renderPasses?: Set<RenderPass>,
        instanceCount = 1,
        ) {
        super(renderPipeline, renderPasses);
        this.dynamicBuffers.push([this.renderPipeline.bindgroupdrawable.gpu.BindGroupPosition, dynamicIndex])
        if (instanceCount == 0)
            console.warn('Added drawable with 0 instances, nothing will be drawn');
        this.#instanceCount = instanceCount;
    }
    debug_render_normals(node: DataNode) {
        const gpu = this.renderPipeline.bindgroupdrawable.gpu;
        const vertices = node.verticesArray;
        const stride=this.node.vertices_stride;

        const debug_render_normals_vertexBuffer = gpu.createGPUBuffer(this.node.positions_count*stride*2*Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX], true);
        const view = new Float32Array( debug_render_normals_vertexBuffer.getMappedRange());
        vertices.forEach((v,i) => {
            view.set(v,i*stride*2)
            view.set(v,i*stride*2+stride)
        })
        debug_render_normals_vertexBuffer.unmap();

        const mesh = new NormalsMesh(this.node.positions_count*2,stride)
        mesh.drawable.setVertexBuffer(0,debug_render_normals_vertexBuffer)
    }
    debug_bounding_box() {
        const vectors_simd=new Float32Array(engine.memory.buffer, engine.rust.bounding_vectors_pointer_simd(this.node.ptr), 3*4*2);
        const vectors = new Float32Array([
            vectors_simd[0]!,vectors_simd[4]!, vectors_simd[8]!, 0,
            vectors_simd[1]!,vectors_simd[5]!, vectors_simd[9]!, 0,
            vectors_simd[2]!,vectors_simd[6]!, vectors_simd[10]!, 0,
            vectors_simd[3]!,vectors_simd[7]!, vectors_simd[11]!, 0,

            vectors_simd[12]!,vectors_simd[16]!, vectors_simd[20]!, 0,
            vectors_simd[13]!,vectors_simd[17]!, vectors_simd[21]!, 0,
            vectors_simd[14]!,vectors_simd[18]!, vectors_simd[22]!, 0,
            vectors_simd[15]!,vectors_simd[19]!, vectors_simd[23]!, 0,
        ]);
        const positions_amount=26;
        const gpu = this.renderPipeline.bindgroupdrawable.gpu;
        const debug_render_boundingbox_vertexBuffer = gpu.createGPUBuffer(positions_amount*4*Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX], true);
        const view = new Float32Array( debug_render_boundingbox_vertexBuffer.getMappedRange());
        view.set(vectors);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 4*4*Float32Array.BYTES_PER_ELEMENT,4),8*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 6*4*Float32Array.BYTES_PER_ELEMENT,4),9*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 1*4*Float32Array.BYTES_PER_ELEMENT,4),10*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 5*4*Float32Array.BYTES_PER_ELEMENT,4),11*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 2*4*Float32Array.BYTES_PER_ELEMENT,4),12*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 0*4*Float32Array.BYTES_PER_ELEMENT,4),13*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 3*4*Float32Array.BYTES_PER_ELEMENT,4),14*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 7*4*Float32Array.BYTES_PER_ELEMENT,4),15*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 0*4*Float32Array.BYTES_PER_ELEMENT,4),16*4);
        
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 6*4*Float32Array.BYTES_PER_ELEMENT,4),17*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 2*4*Float32Array.BYTES_PER_ELEMENT,4),18*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 4*4*Float32Array.BYTES_PER_ELEMENT,4),19*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 0*4*Float32Array.BYTES_PER_ELEMENT,4),20*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 7*4*Float32Array.BYTES_PER_ELEMENT,4),21*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 1*4*Float32Array.BYTES_PER_ELEMENT,4),22*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 3*4*Float32Array.BYTES_PER_ELEMENT,4),23*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 5*4*Float32Array.BYTES_PER_ELEMENT,4),24*4);
        view.set(new Float32Array(vectors.buffer, vectors.byteOffset+ 7*4*Float32Array.BYTES_PER_ELEMENT,4),25*4);

        debug_render_boundingbox_vertexBuffer.unmap();
        const mesh = new BoundingBoxMesh();
        mesh.drawable.setVertexBuffer(0,debug_render_boundingbox_vertexBuffer)
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
        readonly buffer: T,
        public label: string,
        renderPasses?: Set<RenderPass>,) {
        super(renderPipeline, renderPasses);
    }
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        renderEncoder.drawIndirect(this.buffer, 0);
    }
}
export class DrawableSimple extends DrawableDirect {
    constructor(
        renderPipeline: RenderPipeline,
        public node: MainNode,
        renderPasses?: Set<RenderPass>,
        instanceCount = 1,
        public firstVertex = 0,
        public firstInstance = 0) {
            super(renderPipeline, engine.rust.gpu_alignment(node.ptr), node.label, renderPasses, instanceCount);
    }
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        renderEncoder.draw(this.node.positions_count, this.instanceCount, this.firstVertex, this.firstInstance);
    }
}

export class DrawableIndexed extends DrawableDirect {
    constructor(
        renderPipeline: RenderPipeline,
        public node: IndexedNode,
        renderPasses?: Set<RenderPass>,
        private indexBuffer?: GPUIndexBuffer,
        public baseVertex = 0,
        instanceCount = 1,
        public firstIndex = 0,
        public firstInstance = 0,
        private GPUIndexFormat: GPUIndexFormat = 'uint16',
        ) {
        super(renderPipeline,engine.rust.gpu_alignment(node.ptr), node.label, renderPasses, instanceCount);
    }

    override destroy(preserveVerticeBuffers: number[] = [], preserveIndexBuffer = false): void {
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
            this.indexBuffer = this.renderPipeline.bindgroupdrawable.gpu.createGPUBuffer(buffer.byteLength, [GPUBufferUsage.INDEX], true);
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
    render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
        if (this.indexBuffer) {
            renderEncoder.setIndexBuffer(this.indexBuffer, this.GPUIndexFormat);
            renderEncoder.drawIndexed(this.node.indices_count, this.instanceCount, this.firstIndex, this.baseVertex, this.firstInstance);
        }
    }
}