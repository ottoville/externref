import { BoundableNodeSimple } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import type { DrawableSimple } from "../Drawable.js";
import { Engine } from "../../engine.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
import { GPU, GPUBufferUsage } from "../../GPU.js";
import { Buffer, VertexBuffer } from "../../GPU/Buffer.js";

declare const engine:Engine;

export abstract class SimpleMesh extends BoundableNodeSimple {
    drawable:DrawableSimple;
    constructor(
        vBufferCPU: Float32Array,
        label:string,
        has_physic: boolean,
        vBufferGPU?: VertexBuffer,
        scenes?: Scene[]) {

        super(vBufferCPU, 6, false,label,has_physic, scenes);
        this.drawable =  GPU.createRenderPipeline(SimpleRenderPipeline).addDrawableSimple(this)

        if(!vBufferGPU) {
            vBufferGPU = Buffer.create(engine.gpu, vBufferCPU.byteLength, [GPUBufferUsage.VERTEX], 'vertex_'+label, b => {
                new Float32Array(b.getMappedRange()).set(vBufferCPU);
            });
        }
        this.drawable.setVertexBuffer(0, vBufferGPU);
    }
}