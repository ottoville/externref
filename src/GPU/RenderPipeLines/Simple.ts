import type { GPU } from "../../GPU.js";
import { BoundableNodeIndexed } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../RenderPipeline.js";
import type { DrawableIndexed } from "GPU/Drawable.js";

const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function Simple(gpu: GPU) {
    let renderPipeline: RenderPipeline | undefined = renderPipelines.get(gpu);
    if (renderPipeline)
        return renderPipeline;
    renderPipeline = gpu.positionBindGroupTimeWGSL.addRenderPipeline(
        new VertexShader(gpu, 'simple.vert.wgsl', 'main', [{
            arrayStride: 3 * 4,
            stepMode: "vertex",
            attributes: [{
                // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x3"
            }]
        }]), new Shader(gpu, 'simple.frag.wgsl'), {
        label: 'simple',
        primitive: { topology: 'triangle-list' }
    });
    renderPipelines.set(gpu, renderPipeline);
    return renderPipeline
}
export abstract class SimpleMesh extends BoundableNodeIndexed {
    Drawable:DrawableIndexed;
    constructor(
        scene: Scene,
        positionsCount: number,
        indicesView: Uint32Array,
        iBuffer: GPUIndexBuffer,
        vBuffer: GPUVertexBuffer) {

        super(scene, Simple(scene.gpu), positionsCount, 3, indicesView);
        this.Drawable =  this.renderPipeline.addDrawableIndexed(scene, new Set([scene.gpu.renderPassScreen]),this)

        this.Drawable.setVertexBuffer(0, vBuffer);
        this.Drawable.setIndexBuffer(iBuffer, undefined, undefined, indicesView.BYTES_PER_ELEMENT == 4 ? 'uint32' : 'uint16');

    }
}