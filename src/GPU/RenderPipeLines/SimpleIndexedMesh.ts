import type { GPU } from "../../GPU.js";
import { BoundableNodeIndexed } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../RenderPipeline.js";
import type { DrawableIndexed } from "../Drawable.js";
import { Engine } from "../../engine.js";
declare const engine:Engine;

const renderPipelines: Map<GPU, RenderPipeline> = new Map();
export abstract class SimpleIndexedMesh extends BoundableNodeIndexed {
    drawable:DrawableIndexed;
    constructor(
        vBufferCPU: Float32Array,
        indicesView: Uint32Array,
        label:string,
        iBuffer?: GPUIndexBuffer,
        vBufferGPU?: GPUVertexBuffer,
        point_light=0,
        has_physic = false,
        scenes?: Scene[],
        ) {

        super(vBufferCPU, 6, indicesView,has_physic, undefined, point_light,undefined,label,scenes);
        let renderPipeline = renderPipelines.get(engine.gpu);
        if (!renderPipeline) {
            renderPipeline = engine.gpu.positionBindGroupTimeWGSL.addRenderPipeline('simpleIndexedRenderPipeline',
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
        this.drawable =  renderPipeline.addDrawableIndexed(this, new Set([engine.gpu.renderPassScreen, engine.gpu.pickRenderPass]))
        if(!vBufferGPU) {
            vBufferGPU = engine.gpu.device.createBuffer({ usage: GPUBufferUsage.VERTEX, size: vBufferCPU.byteLength, mappedAtCreation: true }) as GPUVertexBuffer;
            new Float32Array(vBufferGPU.getMappedRange()).set(vBufferCPU);
            vBufferGPU.unmap();
        }
        this.drawable.setVertexBuffer(0, vBufferGPU);
        if(!iBuffer) {
            iBuffer = engine.gpu.device.createBuffer({ usage: GPUBufferUsage.INDEX, size: indicesView.byteLength, mappedAtCreation: true }) as GPUIndexBuffer;
            new Uint32Array(iBuffer.getMappedRange()).set(indicesView);
            iBuffer.unmap();
        }
        this.drawable.setIndexBuffer(iBuffer, undefined, undefined, indicesView.BYTES_PER_ELEMENT == 4 ? 'uint32' : 'uint16');

    }
}