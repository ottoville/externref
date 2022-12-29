import { BoundableNodeSimple } from "../nodes/BoundableNodeSimple.js";
import type { Scene } from "../Scene.js";
import { DrawableSimple } from "../GPU/Drawables/DrawableSimple.js";
import { WaterRenderPipeline } from "../GPU/RenderPipeLines/Water.js";
import type { Engine } from "../engine.js";
import { VertexShader } from "../GPU/RenderPipeline.js";
import { RenderPipeline } from "../GPU/RenderPipeline.js";
declare const engine:Engine;

export class Sea extends BoundableNodeSimple {
    drawable: DrawableSimple<RenderPipeline<VertexShader<[{
        arrayStride: number;
        stepMode: "vertex";
        attributes: {
            shaderLocation: number;
            offset: number;
            format: "float32x3";
        }[];
    }]>>> | undefined;
    override create_collider() {
        return engine.rust.create_cuboid_collider(50000,3,50000,0, false);
     }
    constructor(scenes: Scene[]) {
        super(new Float32Array([
            -50000.0, 3.0, -50000.0,
            50000.0, 3.0, -50000.0,
            -50000.0, 3.0, 50000.0,
            50000.0, 3.0, 50000.0]), undefined, true,'water',false,scenes,true, false); //48    
        if(engine.gpu) {    
            const renderPipeline = engine.gpu.createRenderPipeline(WaterRenderPipeline,{
                topology: 'triangle-strip',
                stripIndexFormat: 'uint16',
                frontFace:'cw'
            });
            this.drawable = new DrawableSimple({
                renderPipeline,
                node: this,
                vertexBuffers: [new Float32Array([-50000.0, 3.0, -50000.0,
                    50000.0, 3.0, -50000.0,
                    -50000.0, 3.0, 50000.0,
                    50000.0, 3.0, 50000.0]),
                ],
                renderPasses: undefined
            });
        }
    }
}