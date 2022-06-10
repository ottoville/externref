import { Shader, VertexShader } from "../RenderPipeline.js";
import { Engine } from "../../engine.js";

declare const engine:Engine;

export const TerrainRenderPipeline=['TerrainRenderPipeline',function create(label:string,primitive: GPUPrimitiveState) {
    return engine.gpu!.lightsBindGroupTexture2.addRenderPipeline(label,new VertexShader(engine.gpu!,'ground.vert.wgsl',  [
        {
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
            shaderLocation: 2,
            offset: 16,
            format: "float32x3"
        },
        {
            // uv
            shaderLocation: 1,
            offset: 32,
            format: "float32x2"
        }
        ]
    }
    ]), new Shader(engine.gpu!,'ground.frag.wgsl'), {
        primitive
    });
}] as const