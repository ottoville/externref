import { MainNode } from "../../../MainNode.js";
import { NormalsPipeline } from "../../RenderPipeLines/Normals.js";
import { DrawableSimple } from "../../Drawables/DrawableSimple.js";
import { Buffer, GPUBufferUsage } from "../../Buffer/Buffer.js"
import { DrawableIndexed } from "GPU/Drawables/DrawableIndexed.js";

export class NormalsMesh extends MainNode {
    drawable: DrawableSimple | undefined;
    constructor(targetNode: DrawableIndexed) {
        const positionsCount = targetNode.node.positions_count * 2
        super({ positionsCount, label: 'NormalsDebug' });
        
        const gpu = targetNode.renderPipeline.bindgroupdrawable.bindGroupLayout.gpu;
        const vertices = targetNode.node.verticesArray;
        const stride = targetNode.node.vertices_stride;
        const vertexBuffer = Buffer.create(gpu, targetNode.node.positions_count * stride * 2 * Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX], 'vertex_debug_render_normals', b => {
            const view = new Float32Array(b.getMappedRange());
            vertices.forEach((v, i) => {
                view.set(v, i * stride * 2)
                view.set(v, i * stride * 2 + stride)
            })
        });

        const renderPipeline = gpu.createRenderPipeline(NormalsPipeline, { topology: 'line-list' });
        this.drawable = new DrawableSimple({
            node: this,
            renderPipeline,
            renderPasses: undefined,
            vertexBuffers: [vertexBuffer]
        })
    }
}