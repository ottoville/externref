import { MainNode } from "../../../MainNode.js";
import { NormalsPipeline } from "../../RenderPipeLines/Normals.js";
import type { Engine } from "../../../engine.js";
import type { DrawableSimple } from "../../Drawables/DrawableSimple.js";
declare const engine:Engine;

export class NormalsMesh extends MainNode {
    drawable: DrawableSimple | undefined;
    constructor(positionsCount: number) {        
        super({positionsCount, label: 'NormalsDebug'});
        if(engine.gpu)
            this.drawable = engine.gpu.createRenderPipeline(NormalsPipeline,{ topology:'line-list' }).addDrawableSimple(this,undefined,undefined,undefined);
    }
}