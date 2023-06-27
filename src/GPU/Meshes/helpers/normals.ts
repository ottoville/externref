import { NormalsPipeline } from '../../RenderPipeLines/Normals.js';
import { DrawableSimple } from '../../Drawables/DrawableSimple.js';
import { Buffer, GPUBufferUsage } from '../../Buffer/Buffer.js'
import type { RenderPipeline } from '../../RenderPipeline.js';
import type { DrawableDirect } from '../../Drawables/DrawableDirect.js';
import { DataNode, allocate_vec } from '../../../nodes/DataNode.js';
import { new_rust_mesh } from '../../../MainNode.js';

export class NormalsMesh extends DataNode {
    drawable: DrawableSimple<RenderPipeline>;
    constructor(targetNode: DrawableDirect<DataNode>) {
        const gpu = targetNode.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu;
        const vertices = targetNode.node.verticesArray;
        const stride = 16 // 8*2;
        const newVertices = new Float32Array(targetNode.node.positions_count * stride)
        vertices.forEach((v, i) => {
            const slice = v.slice(0, 8);
            newVertices.set(slice, i * stride);
            newVertices.copyWithin(i * stride + 8, i * stride, i * stride + 8)
        })
        const vertexBuffer = Buffer.create(gpu, targetNode.node.positions_count * stride * Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX], 'vertex_debug_render_normals', b => {
            new Float32Array(b.getMappedRange()).set(newVertices)
        });
        const mesh_id = new_rust_mesh({
            label: 'NormalsDebug',
            rigid_body: false,
        });
        super({
            character_can_collide_to: false,
            vertices: {
                stride: 8,
                view: allocate_vec(newVertices),
            },
        },
        mesh_id);


        this.translation = targetNode.node.translation;
        this.update_scale(targetNode.node.scale_x, targetNode.node.scale_y, targetNode.node.scale_z);
        this.rotation = targetNode.node.rotation;
        const renderPipeline = gpu.createRenderPipeline(NormalsPipeline, { topology: 'line-list', }, { stride: 8, });
        this.drawable = new DrawableSimple({
            node: this,
            renderPasses: undefined,
            renderPipeline,
            vertexBuffers: [vertexBuffer],
        });
    }
}