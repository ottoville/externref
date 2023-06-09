import type { RenderPipeline } from "../../RenderPipeline.js";
import type { DrawableDirect } from "../../Drawables/DrawableDirect.js";
import { DrawableIndexed } from "../../Drawables/DrawableIndexed.js";
import { MainNode, new_rust_mesh } from "../../../MainNode.js";
import { VertexBuffer } from "../../Buffer/Buffer.js";
import { DebugLinesPipeline_vertexBuffer } from "../../RenderPipeLines/DebugLinesPipeline_vertexBuffer.js";
import { allocate_vec } from "../../../nodes/DataNode.js";
import { IndexedTrait, NodeIndexed2 } from "../../../nodes/NodeIndexed2.js";
import type { Engine } from "../../../engine.js";
declare const engine: Engine;

export class WireFrameMesh_vertexBuffer extends MainNode implements IndexedTrait{
    drawable: DrawableIndexed<RenderPipeline>;
    indexed: NodeIndexed2;
    constructor(targetNode: DrawableDirect<IndexedTrait>, vertexBuffer: VertexBuffer) {
        const gpu = targetNode.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu;

        const mesh_id = new_rust_mesh({
            label: 'Wireframe_'+targetNode.node.label,
            rigid_body: false,
        });
        const targetIndices = targetNode.node.indexed.indices;

        const indices = new Uint32Array(targetIndices.length * 2)
        for (let i = 0; i < targetIndices.length / 3; i++) {
            indices[i * 6] = targetIndices[i * 3]!
            indices[i * 6 + 1] = targetIndices[i * 3 + 1]!
            indices[i * 6 + 2] = targetIndices[i * 3 + 1]!
            indices[i * 6 + 3] = targetIndices[i * 3 + 2]!
            indices[i * 6 + 4] = targetIndices[i * 3 + 2]!
            indices[i * 6 + 5] = targetIndices[i * 3]!
        }
        super(mesh_id);
        engine.rust.create_geometry(this.id, true, 12., true, false);

        this.indexed = new NodeIndexed2(this, allocate_vec(indices))


        this.translation = targetNode.node.translation;
        this.update_scale(targetNode.node.scale_x, targetNode.node.scale_y, targetNode.node.scale_z);
        this.rotation = targetNode.node.rotation;

        //TODO: Share same transformation matrix instead of updating it from other
        targetNode.node.onMeshChange.add(() => {
            const targetTranslation = targetNode.node.translation;
            this.translation = [targetTranslation[0], targetTranslation[1]+3, targetTranslation[2]];
            this.update_scale(targetNode.node.scale_x, targetNode.node.scale_y, targetNode.node.scale_z);
            this.rotation = targetNode.node.rotation;
        })

        const renderPipeline = gpu.createRenderPipeline(DebugLinesPipeline_vertexBuffer, { topology: 'line-list' }, { stride: 12 });
        this.drawable = new DrawableIndexed({
            renderPipeline,
            renderPasses: undefined,
            vertexBuffers: [vertexBuffer],
            node: this
        });
    }
}