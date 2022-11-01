import { MainNode } from "../../../MainNode.js";
import { DrawableSimple } from "../../Drawables/DrawableSimple.js";

import { BoundingBoxPipeline } from "../../RenderPipeLines/Boundingbox.js";

import type { Engine } from "../../../engine.js";
import type { VertexBuffer } from "../../Buffer.js";
import { RenderPipeline, VertexShader } from "../../RenderPipeline.js";
declare const engine:Engine;


export class BoundingBoxMesh extends MainNode {
    drawable: DrawableSimple<RenderPipeline<VertexShader<[{
        arrayStride: number;
        stepMode: "vertex";
        attributes: {
            shaderLocation: number;
            offset: number;
            format: "float32x3";
        }[];
    }]>>> | undefined;
    constructor(vertexBuffer: VertexBuffer) {         
        super({positionsCount: 26, label: 'BoundingBoxDebug'});
        if(engine.gpu) {
            const renderPipeline = engine.gpu.createRenderPipeline(BoundingBoxPipeline,{ topology: 'line-strip', stripIndexFormat:'uint32' });
            this.drawable = new DrawableSimple({
                renderPipeline,
                renderPasses: undefined,
                node: this,
                vertexBuffers: [vertexBuffer]
            })
        }
    }
}