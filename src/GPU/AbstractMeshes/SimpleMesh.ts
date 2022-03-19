import { BoundableNodeSimple } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import type { DrawableSimple } from "../Drawable.js";
import { Engine } from "../../engine.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
import { GPU } from "../../GPU.js";

declare const engine:Engine;

export abstract class SimpleMesh extends BoundableNodeSimple {
    drawable:DrawableSimple;
    constructor(
        vBufferCPU: Float32Array,
        label:string,
        has_physic: boolean,
        vBufferGPU?: GPUVertexBuffer,
        scenes?: Scene[]) {

        super(vBufferCPU, 6, false,label,has_physic, scenes);
        this.set_vertices(vBufferCPU);
        this.drawable =  GPU.createRenderPipeline(SimpleRenderPipeline).addDrawableSimple(this)

        if(!vBufferGPU) {
            vBufferGPU = engine.gpu.device.createBuffer({ usage: GPUBufferUsage.VERTEX, size: vBufferCPU.byteLength, mappedAtCreation: true }) as GPUVertexBuffer;
            new Float32Array(vBufferGPU.getMappedRange()).set(vBufferCPU);
            vBufferGPU.unmap();
        }

        this.drawable.setVertexBuffer(0, vBufferGPU);
    }
}