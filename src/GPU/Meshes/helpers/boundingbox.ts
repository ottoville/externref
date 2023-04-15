import { MainNode } from "../../../MainNode.js";
import { Buffer, GPUBufferUsage } from "../../Buffer/Buffer.js"
import { DebugLinesPipeline } from "../../RenderPipeLines/DebugLinesPipeline.js";
import type { Engine } from "../../../engine.js";
import { DrawableIndexed } from "../../Drawables/DrawableIndexed.js";
import { DrawableSimple } from "../../Drawables/DrawableSimple.js";
import type { RenderPipeline } from "../../RenderPipeline.js";
import type { DebugBoundingBoxVertShader } from "../../Shaders/devtools/debug_boundingbox.vert.js";
declare const engine: Engine;


export class BoundingBoxMesh extends MainNode {
    drawable: DrawableSimple<RenderPipeline<DebugBoundingBoxVertShader>> | undefined;
    constructor(targetNode: DrawableIndexed) {
        super({ positionsCount: 26, label: 'BoundingBoxDebug', rigid_body: false });
        const vectors_simd = new Float32Array(engine.memory.buffer, engine.rust.bounding_vectors_pointer_simd(targetNode.node.id), 3 * 4 * 2);
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
        const gpu = targetNode.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu;
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
        if (engine.gpu) {
            const renderPipeline = engine.gpu.createRenderPipeline(DebugLinesPipeline, { topology: 'line-strip', stripIndexFormat: 'uint32' });
            this.drawable = new DrawableSimple({
                renderPipeline,
                renderPasses: undefined,
                vertexBuffers: [debug_render_boundingbox_vertexBuffer],
                node: this
            })
        }
    }
}