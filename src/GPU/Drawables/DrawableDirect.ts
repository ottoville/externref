import { type DrawableNode, MainNode } from "../../MainNode.js";
import { Drawable } from "./Drawable.js";
import type { RenderPipeline } from "../RenderPipeline";
import type { BindGroup } from "../BindGroup.js";
import type { RenderPass } from "../RenderPasses/RenderPass.js";
import type { DataNode } from "nodes/DataNode.js";
import { Buffer } from "../Buffer.js";
import { NormalsMesh } from "../Meshes/helpers/normals.js";
import { GPUBufferUsage } from "../../GPU.js"
import type { Engine } from "../../engine.js";
import { BoundingBoxMesh } from "../../GPU/Meshes/helpers/boundingbox.js";
declare const engine: Engine;


export abstract class DrawableDirect extends Drawable {
    #instanceCount: number;
    protected abstract node: DrawableNode

    constructor(
        renderPipeline: RenderPipeline,
        dynamicBindGroups: [BindGroup, number][],
        public label: string,
        renderPasses?: Set<RenderPass>,
        instanceCount = 1,
    ) {
        super(renderPipeline, renderPasses, dynamicBindGroups);
        if (instanceCount == 0)
            console.warn('Added drawable with 0 instances, nothing will be drawn');
        this.#instanceCount = instanceCount;
    }
    debug_render_normals(node: DataNode) {
        const gpu = this.renderPipeline.bindgroupdrawable.bindGroupLayout.gpu;
        const vertices = node.verticesArray;
        const stride = node.vertices_stride;

        const debug_render_normals_vertexBuffer = Buffer.create(gpu, this.node.positions_count * stride * 2 * Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX], 'vertex_debug_render_normals', b => {
            const view = new Float32Array(b.getMappedRange());
            vertices.forEach((v, i) => {
                view.set(v, i * stride * 2)
                view.set(v, i * stride * 2 + stride)
            })
        });
        const mesh = new NormalsMesh(this.node.positions_count * 2)
        mesh.drawable!.setVertexBuffer(0, debug_render_normals_vertexBuffer)
    }
    debug_bounding_box() {
        if(!(this.node instanceof MainNode)) {
            console.warn("Cannot debug_bounding_box on UI elements")
            return;
        }
        const vectors_simd = new Float32Array(engine.memory.buffer, engine.rust.bounding_vectors_pointer_simd(this.node.ptr), 3 * 4 * 2);
        const vectors = new Float32Array([
            vectors_simd[0]!, vectors_simd[4]!, vectors_simd[8]!, 0,
            vectors_simd[1]!, vectors_simd[5]!, vectors_simd[9]!, 0,
            vectors_simd[2]!, vectors_simd[6]!, vectors_simd[10]!, 0,
            vectors_simd[3]!, vectors_simd[7]!, vectors_simd[11]!, 0,

            vectors_simd[12]!, vectors_simd[16]!, vectors_simd[20]!, 0,
            vectors_simd[13]!, vectors_simd[17]!, vectors_simd[21]!, 0,
            vectors_simd[14]!, vectors_simd[18]!, vectors_simd[22]!, 0,
            vectors_simd[15]!, vectors_simd[19]!, vectors_simd[23]!, 0,
        ]);
        const positions_amount = 26;
        const gpu = this.renderPipeline.bindgroupdrawable.bindGroupLayout.gpu;
        const debug_render_boundingbox_vertexBuffer = Buffer.create(gpu, positions_amount * 4 * Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX], 'vertex_debug_bounding_box', b => {
            const view = new Float32Array(b.getMappedRange());
            view.set(vectors);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 4 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 8 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 6 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 9 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 1 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 10 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 5 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 11 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 2 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 12 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 0 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 13 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 3 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 14 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 7 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 15 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 0 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 16 * 4);

            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 6 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 17 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 2 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 18 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 4 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 19 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 0 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 20 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 7 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 21 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 1 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 22 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 3 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 23 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 5 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 24 * 4);
            view.set(new Float32Array(vectors.buffer, vectors.byteOffset + 7 * 4 * Float32Array.BYTES_PER_ELEMENT, 4), 25 * 4);
        });
        const mesh = new BoundingBoxMesh();
        mesh.drawable!.setVertexBuffer(0, debug_render_boundingbox_vertexBuffer)
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