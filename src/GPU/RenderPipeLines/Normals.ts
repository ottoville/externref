import { Shader, VertexShader } from "../RenderPipeline.js";
import { Engine } from "../../engine.js";
declare const engine:Engine;

export const NormalsPipeline = ['NormalsPipeline',function create(label:string,primitive: GPUPrimitiveState) {
    return engine.gpu!.positionBindGroupTimeWGSL.addRenderPipeline(label, new VertexShader(engine.gpu!,'debug_normals.vert.wgsl', [{
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
    }]), new Shader(engine.gpu!,'color.frag.wgsl'), {
        primitive
    });
}] as const