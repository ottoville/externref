import { MainNode } from "../../../MainNode.js";
import { DrawableSimple } from "../../Drawable.js";

import { BoundingBoxPipeline } from "../../RenderPipeLines/Boundingbox.js";

import type { Engine } from "../../../engine.js";
declare const engine:Engine;


export class BoundingBoxMesh extends MainNode {
    drawable: DrawableSimple | undefined;
    constructor() {         
        super({positionsCount: 26, label: 'BoundingBoxDebug'});
        if(engine.gpu)
            this.drawable = engine.gpu.createRenderPipeline(BoundingBoxPipeline,{ topology: 'line-strip', stripIndexFormat:'uint32' }).addDrawableSimple(this,undefined,undefined,undefined);
    }
}