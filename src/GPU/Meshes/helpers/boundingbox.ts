import { new_rust_mesh } from '../../../MainNode.js';
import { Buffer, GPUBufferUsage } from '../../Buffer/Buffer.js'
import { DebugLinesPipeline } from '../../RenderPipeLines/DebugLinesPipeline.js';
import type { Engine, rust_pointer } from '../../../engine.js';
import { DrawableIndexed } from '../../Drawables/DrawableIndexed.js';
import type { RenderPipeline } from '../../RenderPipeline.js';
import type { DebugBoundingBoxVertShader } from '../../Shaders/devtools/debug_boundingbox.vert.js';
import { DataNode, allocate_vec } from '../../../nodes/DataNode.js';
import { IndexedTrait, NodeIndexed2 } from '../../../nodes/NodeIndexed2.js';
declare const engine: Engine;


export class BoundingBoxMesh extends DataNode implements IndexedTrait {
    drawable: DrawableIndexed<RenderPipeline<DebugBoundingBoxVertShader>> | undefined;
    indexed: NodeIndexed2;
    constructor(targetNode: DrawableIndexed) {
        const [ptr, len, cap] = new Uint32Array(engine.rust.memory.buffer,
            engine.rust.bounding_vectors_pointer_simd(targetNode.node.id),
            3);
        const positions_amount = 26;
        const gpu = targetNode.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu;
        const debug_render_boundingbox_vertexBuffer = Buffer.create(gpu,
            positions_amount * 4 * Float32Array.BYTES_PER_ELEMENT,
            [GPUBufferUsage.VERTEX],
            'vertex_debug_bounding_box',
            b => {
                const view = new Float32Array(b.getMappedRange());
                view.set(new Float32Array(engine.rust.memory.buffer,
                    ptr,
                    len));
            });
        super(
            {
                vertices: {
                    stride: 4,
                    view: [ptr as rust_pointer<'f32'>, len!, cap!],
                },
            },
            new_rust_mesh({
                label: 'BoundingBox_' + targetNode.node.label, rigid_body: false,
            }),
            true);
        this.indexed = new NodeIndexed2(this,
            allocate_vec(Uint32Array.of(0,
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                4,
                6,
                1,
                5,
                2,
                0,
                3,
                7,
                0,
                6,
                2,
                4,
                0,
                7,
                1,
                3,
                5,
                7)));
        this.positions_count = 26;


        const renderPipeline = gpu.createRenderPipeline(DebugLinesPipeline,
            {
                stripIndexFormat: 'uint32',
                topology: 'line-strip',
            },
            {
                stride: 4,
            }
        );
        this.drawable = new DrawableIndexed({
            node: this,
            renderPasses: undefined,
            renderPipeline,
            vertexBuffers: [debug_render_boundingbox_vertexBuffer],
        });
    }
}