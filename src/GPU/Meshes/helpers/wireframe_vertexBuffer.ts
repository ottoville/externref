import type { RenderPipeline } from "../../RenderPipeline.js";
import type { DrawableDirect } from "../../Drawables/DrawableDirect.js";
import { NodeIndexed } from "../../../nodes/NodeIndexed.js";
import { DrawableIndexed } from "../../Drawables/DrawableIndexed.js";
import { MainNode, new_rust_mesh } from "../../../MainNode.js";
import { VertexBuffer } from "../../Buffer/Buffer.js";
import { DebugLinesPipeline_vertexBuffer } from "../../RenderPipeLines/DebugLinesPipeline_vertexBuffer.js";

export class WireFrameMesh_vertexBuffer extends MainNode {
    drawable: DrawableIndexed<RenderPipeline>;
    constructor(targetNode: DrawableDirect<NodeIndexed>, vertexBuffer: VertexBuffer) {
        const gpu = targetNode.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu;

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
            label: 'Wireframe_'+targetNode.node.label,
            rigid_body: false,
        });
        super(mesh_id);
        this.translation = targetNode.node.translation;
        this.update_scale(targetNode.node.scale_x, targetNode.node.scale_y, targetNode.node.scale_z);
        this.rotation = targetNode.node.rotation;

        //TODO: Share same transformation matrix instead of updating it from other
        targetNode.node.onMeshChange.add(() => {
            this.translation = targetNode.node.translation;
            this.update_scale(targetNode.node.scale_x, targetNode.node.scale_y, targetNode.node.scale_z);
            this.rotation = targetNode.node.rotation;
        })

        const renderPipeline = gpu.createRenderPipeline(DebugLinesPipeline_vertexBuffer, { topology: 'line-list' });
        this.drawable = new DrawableIndexed({
            renderPipeline,
            renderPasses: undefined,
            vertexBuffers: [vertexBuffer],
            node: targetNode.node
        });
        /*
            drawable gets default index-buffer from targetNode.node but we want to use
            the index-buffer we created here for debugging purpose.
            Set new indexbuffer without destroying old.
        */
        this.drawable.setIndexBuffer(indices, undefined, false);
        /*
            Override default indices_count other than targetNode indices_count.
        */
        this.drawable.indices_count = indices.length
    }
}