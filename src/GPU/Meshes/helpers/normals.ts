import { MainNode } from "../../../MainNode.js";
import { NormalsPipeline } from "../../RenderPipeLines/Normals.js";
import { DrawableSimple } from "../../Drawables/DrawableSimple.js";
import { Buffer, GPUBufferUsage } from "../../Buffer/Buffer.js"
import type { RenderPipeline } from "../../RenderPipeline.js";
import type { DrawableDirect } from "../../Drawables/DrawableDirect.js";
import type { DataNode } from "../../../nodes/DataNode.js";

export class NormalsMesh extends MainNode {
    drawable: DrawableSimple<RenderPipeline>;
    constructor(targetNode: DrawableDirect<DataNode>) {
        const positionsCount = targetNode.node.positions_count * 2
        super({ positionsCount, label: 'NormalsDebug', rigid_body: false });

        const gpu = targetNode.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu;
        const vertices = targetNode.node.verticesArray;
        const stride = 16 // 8*2;
        const vertexBuffer = Buffer.create(gpu, targetNode.node.positions_count * stride * Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX], 'vertex_debug_render_normals', b => {
            const view = new Float32Array(b.getMappedRange());
            vertices.forEach((v, i) => {
                const slice = v.slice(0, 8);
                view.set(slice, i * stride);
                view.copyWithin(i * stride + 8, i * stride, i * stride + 8)
            })
        });
        this.translation = targetNode.node.translation;
        this.update_scale(targetNode.node.scale_x, targetNode.node.scale_y, targetNode.node.scale_z);
        this.rotation = targetNode.node.rotation;
        const renderPipeline = gpu.createRenderPipeline(NormalsPipeline, { topology: 'line-list' });
        this.drawable = new DrawableSimple({
            renderPipeline,
            renderPasses: undefined,
            vertexBuffers: [vertexBuffer],
            node: this
        });
    }
}