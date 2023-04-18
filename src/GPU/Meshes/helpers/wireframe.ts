import type { RenderPipeline } from "../../RenderPipeline.js";
import type { DrawableDirect } from "../../Drawables/DrawableDirect.js";
import { NodeIndexed } from "../../../nodes/NodeIndexed.js";
import { DrawableIndexed } from "../../Drawables/DrawableIndexed.js";
import { DebugLinesPipeline } from "../../RenderPipeLines/DebugLinesPipeline.js";
import { new_rust_mesh } from "../../../MainNode.js";

export class WireFrameMesh extends NodeIndexed {
    drawable: DrawableIndexed<RenderPipeline>;
    constructor(targetNode: DrawableDirect<NodeIndexed>) {
        const gpu = targetNode.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu;
        const stride = 4
        const vertices = new Float32Array(targetNode.node.positions_count * 4);
        targetNode.node.verticesArray.forEach((v, i) => {
            const slice = v.slice(0, stride);
            vertices.set(slice, i * stride);
        });
        const targetIndices = targetNode.node.indices;
        const indices = new Uint32Array(targetIndices.length * 2)
        for (let i = 0; i < targetIndices.length / 3; i++) {
            indices[i * 6] = targetIndices[i * 3]!
            indices[i * 6 + 1] = targetIndices[i * 3 + 1]!
            indices[i * 6 + 2] = targetIndices[i * 3 + 1]!
            indices[i * 6 + 3] = targetIndices[i * 3 + 2]!
            indices[i * 6 + 4] = targetIndices[i * 3 + 2]!
            indices[i * 6 + 5] = targetIndices[i * 3]!
        }
        const mesh_id = new_rust_mesh({
            label: 'WireframeDebug',
            rigid_body: false,
        });
        super(
            {
                vertices: {
                    view: vertices,
                    stride
                },
                can_collide: false,
                character_can_collide_to: false
            },
            mesh_id,
            false,
            indices);
        this.translation = targetNode.node.translation;
        this.update_scale(targetNode.node.scale_x, targetNode.node.scale_y, targetNode.node.scale_z);
        this.rotation = targetNode.node.rotation;
        const renderPipeline = gpu.createRenderPipeline(DebugLinesPipeline, { topology: 'line-list' });
        this.drawable = new DrawableIndexed({
            renderPipeline,
            renderPasses: undefined,
            vertexBuffers: [vertices],
            node: this
        });
    }
}