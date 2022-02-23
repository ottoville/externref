import { Shader, VertexShader, type RenderPipeline } from "../../RenderPipeline.js";
import type { GPU } from "../../../GPU.js";
import { MainNode } from "../../../MainNode.js";
import { DrawableSimple } from "../../Drawable.js";

import type { Engine } from "../../../engine.js";
declare const engine:Engine;

const DebugNormalsRenderPipelines: Map<GPU, RenderPipeline> = new Map();
function DebugNormalsPipeline(entryPoint='main', topology:GPUPrimitiveTopology='line-list') {
    const renderPipeline = DebugNormalsRenderPipelines.get(engine.gpu);
    if (renderPipeline)
        return renderPipeline;

    const renderPipeLine = engine.gpu.positionBindGroupTimeWGSL.addRenderPipeline('normalsRenderPipeline', new VertexShader(engine.gpu,'debug_normals.vert.wgsl', entryPoint, [{
        arrayStride: 48,
        stepMode: "vertex",
        attributes: [{
            // position
            shaderLocation: 0,
            offset: 0,
            format: "float32x3"
        },
        {
            // normals
            shaderLocation: 1,
            offset: 16,
            format: "float32x3"
        }
        ]
    }]), new Shader(engine.gpu,'color.frag.wgsl','main'), {
        primitive: { topology }
    });
    DebugNormalsRenderPipelines.set(engine.gpu, renderPipeLine);
    return renderPipeLine;
}
export class NormalsMesh extends MainNode {
    drawable:DrawableSimple;
    constructor(positionsCount: number, stride=12) {        
        super(false, false, positionsCount,stride, undefined, undefined, undefined, undefined, 'NormalsDebug');
        const renderPipeline=DebugNormalsPipeline('normals');
        this.drawable=renderPipeline.addDrawableSimple(this,undefined,undefined,undefined);
    }
}