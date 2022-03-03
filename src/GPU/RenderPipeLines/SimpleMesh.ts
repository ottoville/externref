import type { GPU } from "../../GPU.js";
import { BoundableNodeSimple } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../RenderPipeline.js";
import type { DrawableSimple } from "../Drawable.js";
import { Engine } from "../../engine.js";
declare const engine:Engine;

const renderPipelines: Map<GPU, RenderPipeline> = new Map();
export abstract class SimpleMesh extends BoundableNodeSimple {
    drawable:DrawableSimple;
    constructor(
        vBufferCPU: Float32Array,
        label:string,
        has_physic: boolean,
        vBufferGPU?: GPUVertexBuffer,
        scenes?: Scene[]) {

        super(vBufferCPU, 6, false,label,has_physic, scenes);
        this.set_vertices(vBufferCPU)
        let renderPipeline = renderPipelines.get(engine.gpu);
        if (!renderPipeline) {
            renderPipeline = engine.gpu.positionBindGroupTimeWGSL.addRenderPipeline('SimpleRenderPipeline',
                new VertexShader(engine.gpu, 'simple.vert.wgsl', [{
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
                }]), new Shader(engine.gpu, 'simple.frag.wgsl'), {
                primitive: { topology: 'triangle-list' },
            });
            renderPipelines.set(engine.gpu, renderPipeline);
        }
        this.drawable =  renderPipeline.addDrawableSimple(this)

        if(!vBufferGPU) {
            vBufferGPU = engine.gpu.device.createBuffer({ usage: GPUBufferUsage.VERTEX, size: vBufferCPU.byteLength, mappedAtCreation: true }) as GPUVertexBuffer;
            new Float32Array(vBufferGPU.getMappedRange()).set(vBufferCPU);
            vBufferGPU.unmap();
        }

        this.drawable.setVertexBuffer(0, vBufferGPU);
    }
}