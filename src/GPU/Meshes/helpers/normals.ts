import { MainNode } from "../../../MainNode.js";
import { DrawableSimple } from "../../Drawable.js";
import { NormalsPipeline } from "../../RenderPipeLines/Normals.js";

import type { Engine } from "../../../engine.js";
declare const engine:Engine;

export class NormalsMesh extends MainNode {
    drawable: DrawableSimple | undefined;
    constructor(positionsCount: number) {        
        super(positionsCount,undefined, undefined, undefined, 'NormalsDebug');
        if(engine.gpu)
            this.drawable = engine.gpu.createRenderPipeline(NormalsPipeline,{ topology:'line-list' }).addDrawableSimple(this,undefined,undefined,undefined);
    }
}