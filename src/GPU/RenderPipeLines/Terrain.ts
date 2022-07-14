import { Shader, VertexShader } from "../RenderPipeline.js";
import type { GPU } from "../../GPU";


export const TerrainRenderPipeline=['TerrainRenderPipeline',function create(gpu:GPU, label:string,primitive: GPUPrimitiveState) {
    return gpu.lightsBindGroupTexture2.addRenderPipeline(label,new VertexShader(gpu,'ground.vert.wgsl',  [
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
    ]), new Shader(gpu,'ground.frag.wgsl'), {
        primitive
    });
}] as const