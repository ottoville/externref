import { Shader, VertexShader, type RenderPipeline } from "../../RenderPipeline.js";
import type { GPU } from "../../../GPU.js";
import { MainNode } from "../../../MainNode.js";
import { DrawableSimple } from "../../Drawable.js";

import type { Engine } from "../../../engine.js";
declare const engine:Engine;

const DebugBoundingRenderPipelines: Map<GPU, RenderPipeline> = new Map();
function DebugBoundingPipeline(topology: GPUPrimitiveTopology = 'line-list') {
    const renderPipeline = DebugBoundingRenderPipelines.get(engine.gpu);
    if (renderPipeline)
        return renderPipeline;

    const renderPipeLine = engine.gpu.positionBindGroupTimeWGSL.addRenderPipeline('colorRenderPipeline',
        new VertexShader(engine.gpu, 'debug_boundingbox.vert.wgsl', [{
            arrayStride: 16,
            stepMode: "vertex",
            attributes: [{
                // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x3"
            }
            ]
        }]), new Shader(engine.gpu, 'color.frag.wgsl'), {
        primitive: { topology, stripIndexFormat:'uint32' }
    });
    DebugBoundingRenderPipelines.set(engine.gpu, renderPipeLine);
    return renderPipeLine;
}

export class BoundingBoxMesh extends MainNode {
    drawable:DrawableSimple;
    constructor() {         
        super(false, false, 26,4,undefined,undefined,undefined,undefined,'BoundingBoxDebug');
        const renderPipeline=DebugBoundingPipeline('line-strip');
        this.drawable=renderPipeline.addDrawableSimple(this,undefined,undefined,undefined);
    }
}