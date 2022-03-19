import { GPU } from "../../../GPU.js";
import { MainNode } from "../../../MainNode.js";
import { DrawableSimple } from "../../Drawable.js";
import { NormalsPipeline } from "../../RenderPipeLines/Normals.js";

export class NormalsMesh extends MainNode {
    drawable:DrawableSimple;
    constructor(positionsCount: number, stride=12) {        
        super(false, false, positionsCount,stride, undefined, undefined, undefined, undefined, 'NormalsDebug');
        this.drawable=GPU.createRenderPipeline(NormalsPipeline,{ topology:'line-list' }).addDrawableSimple(this,undefined,undefined,undefined);
    }
}