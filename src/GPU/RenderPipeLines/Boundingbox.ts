import { Shader, VertexShader } from "../RenderPipeline.js";
import { Engine } from "../../engine.js";
declare const engine:Engine;

export const BoundingBoxPipeline = ['BoundingBoxPipeline',function create(label:string,primitive: GPUPrimitiveState) {
    return engine.gpu!.positionBindGroupTimeWGSL.addRenderPipeline(label,
    new VertexShader(engine.gpu!, 'debug_boundingbox.vert.wgsl', [{
        arrayStride: 16,
        stepMode: "vertex",
        attributes: [{
            // position
            shaderLocation: 0,
            offset: 0,
            format: "float32x3"
        }
        ]
    }]), new Shader(engine.gpu!, 'color.frag.wgsl'), {
    primitive
    })
}] as const