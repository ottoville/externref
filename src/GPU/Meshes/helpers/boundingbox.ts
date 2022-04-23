import { MainNode } from "../../../MainNode.js";
import { DrawableSimple } from "../../Drawable.js";

import { BoundingBoxPipeline } from "../../RenderPipeLines/Boundingbox.js";
import { GPU } from "../../../GPU.js";

export class BoundingBoxMesh extends MainNode {
    drawable:DrawableSimple;
    constructor() {         
        super(26,undefined,undefined,undefined,'BoundingBoxDebug');
        this.drawable=GPU.createRenderPipeline(BoundingBoxPipeline,{ topology: 'line-strip', stripIndexFormat:'uint32' }).addDrawableSimple(this,undefined,undefined,undefined);
    }
}