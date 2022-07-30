import { BoundableNodeSimple } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import type { DrawableSimple } from "../Drawable.js";
import { Engine } from "../../engine.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
import { GPUBufferUsage } from "../../GPU.js";
import { Buffer, VertexBuffer } from "../../GPU/Buffer.js";

declare const engine:Engine;

export abstract class SimpleMesh extends BoundableNodeSimple {
    drawable: DrawableSimple | undefined;
    constructor(
        vBufferCPU: Float32Array,
        label:string,
        can_collide: boolean,
        vBufferGPU?: VertexBuffer,
        scenes?: Scene[],
        fixed = false,
        point_light = 0) {
        super(vBufferCPU, 6, false,label,can_collide, scenes, fixed, undefined, point_light);
        this.drawable =  engine.gpu?.createRenderPipeline(SimpleRenderPipeline).addDrawableSimple(this)
        if(!vBufferGPU && engine.gpu) {
            vBufferGPU = Buffer.create(engine.gpu, vBufferCPU.byteLength, [GPUBufferUsage.VERTEX], 'vertex_'+label, b => {
                new Float32Array(b.getMappedRange()).set(vBufferCPU);
            });
        }
        if(vBufferGPU)
            this.drawable?.setVertexBuffer(0, vBufferGPU);
    }
}