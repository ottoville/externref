import type { RenderPass } from "../RenderPasses/RenderPass.js";
import { GPU } from "../../GPU.js"
import { Buffer, type VertexBuffer, GPUBufferUsage } from "../Buffer/Buffer.js";

import type { Engine } from "../../engine.js";
import { BindGroup } from "../BindGroup.js";
import type { RenderPipeline } from "../RenderPipeline.js";
declare const engine: Engine;


export abstract class Drawable {
    abstract label: string;
    #vertexBuffers: Map<number, { buffer: VertexBuffer, offset: number | undefined, size: number | undefined }> = new Map();
    #renderList: Map<RenderPass, Set<Drawable>> = new Map();
    public renderPipeline: Readonly<RenderPipeline>;
    #renderPasses: Set<RenderPass>;
    #dynamicBindGroups: [BindGroup, number][]
    constructor(
        {
            renderPipeline,
            renderPasses = new Set([engine.gpu!.renderPassScreen]),
            dynamicBindGroups = [],
            vertexBuffers = []
        } : {
            renderPipeline: Readonly<RenderPipeline>;
            renderPasses: Set<RenderPass> | undefined;
            dynamicBindGroups?: [BindGroup, number][];
            vertexBuffers: (ArrayBufferView | VertexBuffer)[] | undefined;
        }) {

        this.renderPipeline = renderPipeline;
        this.#renderPasses = renderPasses;
        this.#dynamicBindGroups = dynamicBindGroups;

        vertexBuffers?.forEach((vertexBuffer, i) => {
            this.setVertexBuffer(i, vertexBuffer)
        });
        
        this.#renderPasses.forEach(rp => {
            const variant = rp.getVariant(this.renderPipeline);
            this.#renderList.set(rp, variant.rootDrawables.add(this));
        });
        this.clearBundles();
    }

    #staticBindGroup?: BindGroup;
    setStaticBindGroup(label: string,
        staticBuffers:(bindGroup: BindGroup) => Iterable<GPUBindGroupEntry>) {
        this.clearBundles();
        this.#staticBindGroup = new BindGroup(
            this.renderPipeline.props.bindgroupdrawable.bindGroupLayout,
            label,
            staticBuffers,
            this.#renderPasses
            )
    }
    protected clearBundles() {
        //TODO: is this needed?
        this.#renderPasses.forEach(rp => rp.bundles.forEach(b => b.destroy()));
    }
    destroy(preserveVerticeBuffers: number[] = []): void {
        this.#renderList.forEach(Drawables => Drawables.delete(this));
        this.clearBundles();
        this.#vertexBuffers.forEach((b, key) => {
            if (!preserveVerticeBuffers.includes(key))
                b.buffer.destroy()
        });
    }
    setVertexBuffer(index: number, buffer: ArrayBufferView, destroyOld?: boolean): VertexBuffer
    setVertexBuffer<T extends VertexBuffer>(index: number, buffer: T, destroyOld?: boolean, offset?: number, size?: number): T
    setVertexBuffer(index: number, buffer: ArrayBufferView | VertexBuffer, destroyOld?: boolean, offset?: number, size?: number): VertexBuffer
    setVertexBuffer(index: number, buffer: ArrayBufferView | VertexBuffer, destroyOld = true, offset?: number, size?: number): VertexBuffer {
        if (destroyOld) {
            const Tbuffer = this.#vertexBuffers.get(index);
            if (Tbuffer) {
                Tbuffer.buffer.destroy();
                this.clearBundles();
            }
        }
        if (buffer instanceof Buffer)
            var Tbuffer = buffer;
        else {
            var Tbuffer = Buffer.create(this.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu, buffer.byteLength, [GPUBufferUsage.VERTEX], 'vertex_' + this.label, b => {
                new Uint8Array(b.getMappedRange()).set(new Uint8Array(buffer.buffer));
            })
        }
        this.#vertexBuffers.set(index, { buffer: Tbuffer, offset, size });
        return Tbuffer;
    }
    abstract render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder): void
    draw(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, BindGroupsStart: number, dynamicIndex: number[]) {
        this.#dynamicBindGroups.forEach(([{bindGroup}, offset], i) => {
            const di = dynamicIndex[i];
            if (di) {
                renderEncoder.setBindGroup(di, bindGroup, [GPU.gpu_memory_index_size + offset * GPU.gpu_memory_index_size]);
            }
        });
        if(this.#staticBindGroup) {
            renderEncoder.setBindGroup(BindGroupsStart++, this.#staticBindGroup.bindGroup)
        }
        this.#vertexBuffers.forEach((buffer, index) => renderEncoder.setVertexBuffer(index, buffer.buffer.vertexBuffer, buffer.offset, buffer.size));
        this.render(renderEncoder);
    }
}

