import { MainNode } from "../../../MainNode.js";
import { NormalsPipeline } from "../../RenderPipeLines/Normals.js";
import type { Engine } from "../../../engine.js";
import { DrawableSimple } from "../../Drawables/DrawableSimple.js";
import type { VertexBuffer } from "../../Buffer.js";
declare const engine:Engine;

export class NormalsMesh extends MainNode {
    drawable: DrawableSimple | undefined;
    constructor(positionsCount: number, vertexBuffer: VertexBuffer) {        
        super({positionsCount, label: 'NormalsDebug'});
        if(engine.gpu) {
            const renderPipeline = engine.gpu.createRenderPipeline(NormalsPipeline, { topology:'line-list' });
            this.drawable = new DrawableSimple({
                node: this,
                renderPipeline,
                renderPasses: undefined,
                vertexBuffers: [vertexBuffer]
            })
        }
    }
}