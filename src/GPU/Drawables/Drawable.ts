import type { RenderPass } from "../RenderPasses/RenderPass.js";
import { GPU } from "../../GPU.js"
import { Buffer, type VertexBuffer, GPUBufferUsage } from "../Buffer/Buffer.js";

import type { Engine } from "../../engine.js";
import { BindGroup } from "../BindGroup.js";
import { RenderPipeline } from "../RenderPipeline.js";
declare const engine: Engine;

export type DrawableProps = {
    renderPipeline: Readonly<RenderPipeline>;
    renderPasses?: Set<RenderPass> | undefined;
    dynamicBindGroups?: [BindGroup, number][];
    vertexBuffers: (ArrayBufferView | VertexBuffer)[] | undefined;
    label: string
}
export abstract class Drawable {
    #vertexBuffers: Map<number,
        {
            buffer: VertexBuffer,
            offset: number | undefined,
            size: number | undefined
        }> = new Map();
    #renderList: Map<RenderPass, Set<Drawable>> = new Map();
    public renderPipeline: Readonly<RenderPipeline>;
    #renderPasses: Set<RenderPass>;
    #dynamicBindGroups: [BindGroup, number][]
    label: string;
    destroyed = false;
    constructor(
        {
            renderPipeline,
            renderPasses = new Set([engine.gpu!.renderPassScreen]),
            dynamicBindGroups = [],
            vertexBuffers = [],
            label
        }: Readonly<DrawableProps>) {
        this.label = label;
        this.renderPipeline = renderPipeline;
        this.#renderPasses = renderPasses;
        this.#dynamicBindGroups = dynamicBindGroups;

        vertexBuffers?.forEach((vertexBuffer, i) => {
            this.setVertexBuffer(i, vertexBuffer)
        });
        this.#renderPasses.forEach(rp => {
            const variantP = rp.getVariant(this.renderPipeline);
            // variabtP can be either a promise or results of a promise
            if(variantP instanceof Promise) {
                variantP.then(variant => {
                    if (this.destroyed)
                        return;
                    this.#renderList.set(rp, variant.rootDrawables.add(this));
                    rp.bundles.forEach(b => b.destroy())
                }).catch(err => engine.showError(err))
            } else {
                this.#renderList.set(rp, variantP.rootDrawables.add(this));
                rp.bundles.forEach(b => b.destroy())
            }
        });
    }

    #staticBindGroup?: BindGroup;
    setStaticBindGroup(label: string,
        staticBuffers: (bindGroup: BindGroup) => Iterable<GPUBindGroupEntry>) {
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
        this.destroyed = true;
    }
    setVertexBuffer(index: number, buffer: ArrayBufferView, destroyOld?: boolean): VertexBuffer
    setVertexBuffer<T extends VertexBuffer>(index: number, buffer: T, destroyOld?: boolean, GPUoffset?: number, size?: number): T
    setVertexBuffer(index: number, buffer: ArrayBufferView | VertexBuffer, destroyOld?: boolean, GPUoffset?: number, size?: number): VertexBuffer
    setVertexBuffer(index: number, buffer: ArrayBufferView | VertexBuffer, destroyOld = true, GPUoffset?: number, size?: number): VertexBuffer {
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
            const gpu = this.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu;
            var Tbuffer = Buffer.create(gpu, buffer.byteLength, [GPUBufferUsage.VERTEX], 'DrawableVertex_' + this.label, b => {
                const buff = new Uint8Array(b.getMappedRange());
                buff.set(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength/Uint8Array.BYTES_PER_ELEMENT));
            })
        }
        this.#vertexBuffers.set(index, { buffer: Tbuffer, offset: GPUoffset, size });
        return Tbuffer;
    }
    abstract render(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder): void
    draw(renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder, BindGroupsStart: number, dynamicIndex: number[]) {
        this.#dynamicBindGroups.forEach(([{ bindGroup }, offset], i) => {
            const di = dynamicIndex[i];
            if (di) {
                renderEncoder.setBindGroup(di, bindGroup, [GPU.gpu_memory_index_size + offset * GPU.gpu_memory_index_size]);
            }
        });
        if (this.#staticBindGroup) {
            renderEncoder.setBindGroup(BindGroupsStart++, this.#staticBindGroup.bindGroup)
        }
        this.#vertexBuffers.forEach((buffer, index) => renderEncoder.setVertexBuffer(index, buffer.buffer.vertexBuffer, buffer.offset, buffer.size));
        console.debug('draw', this.label)
        this.render(renderEncoder);
    }
}

