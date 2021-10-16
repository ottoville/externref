import type { GPU } from "../../GPU.js";
import { BoundableNodeIndexed } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../RenderPipeline.js";
import type { DrawableIndexed } from "GPU/Drawable.js";
import { Engine } from "engine.js";
declare const engine:Engine;

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
    drawable:DrawableIndexed;
    constructor(
        vBufferCPU: Float32Array,
        indicesView: Uint32Array,
        iBuffer: GPUIndexBuffer,
        vBufferGPU: GPUVertexBuffer,
        label:string,
        point_light=0,
        scenes?: Scene[]) {

        super(vBufferCPU, 6, indicesView,undefined, point_light,undefined,label,scenes);
        const renderPipeline=Simple(engine.gpu);
        this.drawable =  renderPipeline.addDrawableIndexed(this,label)

        this.drawable.setVertexBuffer(0, vBufferGPU);
        this.drawable.setIndexBuffer(iBuffer, undefined, undefined, indicesView.BYTES_PER_ELEMENT == 4 ? 'uint32' : 'uint16');

    }
}