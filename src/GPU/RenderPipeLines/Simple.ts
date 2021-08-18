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
            arrayStride: 6 * 4,
            stepMode: "vertex",
            attributes: [{
                // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
            }, {
                // normals
                shaderLocation: 1,
                offset: 12,
                format: "float32x3"
            }]
        }]), new Shader(gpu, 'simple.frag.wgsl'), {
        label: 'simple',
        primitive: { topology: 'triangle-list' }
    });
    renderPipelines.set(gpu, renderPipeline);
    return renderPipeline
}
export abstract class SimpleIndexedMesh extends BoundableNodeIndexed {
    Drawable:DrawableIndexed;
    constructor(
        scene: Scene,
        vBufferCPU: Float32Array,
        indicesView: Uint32Array,
        iBuffer: GPUIndexBuffer,
        vBufferGPU: GPUVertexBuffer,
        label:string,
        point_light=0) {

        super(scene, Simple(scene.gpu), vBufferCPU, 6, indicesView,undefined, point_light);
        this.update_vertices(vBufferCPU);
        this.Drawable =  this.renderPipeline.addDrawableIndexed(scene, new Set([scene.gpu.renderPassScreen]),this,label)

        this.Drawable.setVertexBuffer(0, vBufferGPU);
        this.Drawable.setIndexBuffer(iBuffer, undefined, undefined, indicesView.BYTES_PER_ELEMENT == 4 ? 'uint32' : 'uint16');

    }
}