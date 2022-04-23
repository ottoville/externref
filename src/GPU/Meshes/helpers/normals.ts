import { GPU } from "../../../GPU.js";
import { MainNode } from "../../../MainNode.js";
import { DrawableSimple } from "../../Drawable.js";
import { NormalsPipeline } from "../../RenderPipeLines/Normals.js";

export class NormalsMesh extends MainNode {
    drawable:DrawableSimple;
    constructor(positionsCount: number) {        
        super(positionsCount,undefined, undefined, undefined, 'NormalsDebug');
        this.drawable=GPU.createRenderPipeline(NormalsPipeline,{ topology:'line-list' }).addDrawableSimple(this,undefined,undefined,undefined);
    }
}