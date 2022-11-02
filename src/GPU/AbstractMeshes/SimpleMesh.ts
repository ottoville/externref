import { BoundableNodeSimple } from "../../nodes/BoundableNodeSimple.js";
import type { Scene } from "../../Scene.js";
import { DrawableSimple } from "../Drawables/DrawableSimple.js";
import { Engine } from "../../engine.js";
import { SimpleRenderPipeline } from "../RenderPipeLines/Simple.js";
import { Buffer, VertexBuffer, GPUBufferUsage } from "../Buffer.js";
import { RenderPipeline, VertexShader } from "../RenderPipeline.js";

declare const engine:Engine;

export abstract class SimpleMesh extends BoundableNodeSimple {
    drawable: DrawableSimple<RenderPipeline<VertexShader<[{
        arrayStride: number;
        stepMode: "vertex";
        attributes: {
            shaderLocation: number;
            offset: number;
            format: "float32x3";
        }[];
    }]>>> | undefined;
    constructor(
        vBufferCPU: Float32Array,
        label:string,
        can_collide: boolean,
        vBufferGPU?: VertexBuffer,
        scenes?: Scene[],
        fixed = false,
        point_light = 0) {
        super(vBufferCPU, 6, false,label,can_collide, scenes, fixed, undefined, point_light);
        if(engine.gpu) {
            if(!vBufferGPU) {
                vBufferGPU = Buffer.create(engine.gpu, vBufferCPU.byteLength, [GPUBufferUsage.VERTEX], 'vertex_'+label, b => {
                    new Float32Array(b.getMappedRange()).set(vBufferCPU);
                });
            }
            const renderPipeline = engine.gpu.createRenderPipeline(SimpleRenderPipeline);
            this.drawable = new DrawableSimple({
                renderPipeline,
                node: this,
                vertexBuffers: [vBufferGPU],
                renderPasses: undefined
            })
        }
        
    }
}