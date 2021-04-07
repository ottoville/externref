import type { GPU } from "../../GPU.js";
import { BoundableNode } from "../../TerraNode.js";
import type { Scene } from "../../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../RenderPipeline.js";
import { DrawableIndexed } from "GPU/Drawable.js";

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
export abstract class SimpleMesh extends BoundableNode<DrawableIndexed> {
    constructor(
        scene: Scene,
        positionsCount: number,
        indicesView: Uint32Array | Uint16Array,
        iBuffer: GPUIndexBuffer,
        vBuffer: GPUVertexBuffer) {

        super(scene, Simple(scene.gpu), positionsCount, (node) => node.renderPipeline.addDrawableIndexed(scene, new Set([scene.gpu.renderPassScreen]), node), 3, indicesView);
        this.Drawable.dynamicBuffers.set(scene.gpu.BindGroupPosition, this.gpu_alignment);
        this.Drawable.setVertexBuffer(0, vBuffer);
        this.Drawable.setIndexBuffer(iBuffer, undefined, undefined, indicesView.BYTES_PER_ELEMENT == 4 ? 'uint32' : 'uint16');

    }
}