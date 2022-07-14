import { BoundableNodeSimple } from "../DataNode.js";
import type { Scene } from "../Scene.js";
import type { DrawableSimple } from "../GPU/Drawable.js";
import { WaterRenderPipeline } from "../GPU/RenderPipeLines/Water.js";
import type { Engine } from "../engine.js";
declare const engine:Engine;

export class Sea extends BoundableNodeSimple {
    drawable: DrawableSimple | undefined;
    override create_collider() {
        return engine.rust.create_cuboid_collider(50000,3,50000, false);
     }
    constructor(scenes: Scene[]) {
        super(new Float32Array([-50000.0, 3.0, -50000.0,
            50000.0, 3.0, -50000.0,
            -50000.0, 3.0, 50000.0,
            50000.0, 3.0, 50000.0]), undefined, true,'water',false,scenes,true, false); //48    
        if(engine.gpu) {    
            this.drawable = engine.gpu.createRenderPipeline(WaterRenderPipeline,{
                topology: 'triangle-strip',
                stripIndexFormat: 'uint16',
                frontFace:'cw'
            }).addDrawableSimple(this, undefined, undefined, undefined);
        }
        this.drawable?.setVertexBuffer(0, new Float32Array([-50000.0, 3.0, -50000.0,
            50000.0, 3.0, -50000.0,
            -50000.0, 3.0, 50000.0,
            50000.0, 3.0, 50000.0]))
    }
}