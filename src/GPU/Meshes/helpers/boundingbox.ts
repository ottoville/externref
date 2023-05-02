import { new_rust_mesh } from "../../../MainNode.js";
import { Buffer, GPUBufferUsage } from "../../Buffer/Buffer.js"
import { DebugLinesPipeline } from "../../RenderPipeLines/DebugLinesPipeline.js";
import type { Engine, rust_pointer } from "../../../engine.js";
import { DrawableIndexed } from "../../Drawables/DrawableIndexed.js";
import type { RenderPipeline } from "../../RenderPipeline.js";
import type { DebugBoundingBoxVertShader } from "../../Shaders/devtools/debug_boundingbox.vert.js";
import { allocate_vec } from "../../../nodes/DataNode.js";
import { NodeIndexed } from "../../../nodes/NodeIndexed.js";
declare const engine: Engine;


export class BoundingBoxMesh extends NodeIndexed {
    drawable: DrawableIndexed<RenderPipeline<DebugBoundingBoxVertShader>> | undefined;
    constructor(targetNode: DrawableIndexed) {
        const [ptr, len, cap] = new Uint32Array(engine.rust.memory.buffer, engine.rust.bounding_vectors_pointer_simd(targetNode.node.id), 3);
        const positions_amount = 26;
        const gpu = targetNode.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu;
        const debug_render_boundingbox_vertexBuffer = Buffer.create(gpu, positions_amount * 4 * Float32Array.BYTES_PER_ELEMENT, [GPUBufferUsage.VERTEX], 'vertex_debug_bounding_box', b => {
            const view = new Float32Array(b.getMappedRange());
            view.set(new Float32Array(engine.rust.memory.buffer, ptr, len));
        });
        super(
            {
                vertices: {
                    view:  [ptr as rust_pointer<"f32">, len!, cap!],
                    stride: 4
                }
            },
            new_rust_mesh({ label: 'BoundingBox_' + targetNode.node.label, rigid_body: false }),
            true,
            allocate_vec(Uint32Array.of(0,1,2,3,4,5,6,7,
                4,6,1,5,2,0,3,7,0,
                6,2,4,0,7,1,3,5,7)));
        this.positions_count = 26;


        if (engine.gpu) {
            const renderPipeline = engine.gpu.createRenderPipeline(DebugLinesPipeline,
                {
                    topology: 'line-strip',
                    stripIndexFormat: 'uint32'
                }
            );
            this.drawable = new DrawableIndexed({
                renderPipeline,
                renderPasses: undefined,
                vertexBuffers: [debug_render_boundingbox_vertexBuffer],
                node: this
            })
        }
    }
}