import { Shader, VertexShader } from "../RenderPipeline.js";
import { GPU } from "../../GPU.js";

export const NormalsPipeline = ['NormalsPipeline',function create(gpu:GPU, label:string,primitive: GPUPrimitiveState) {
    return gpu.positionBindGroupTimeWGSL.addRenderPipeline(label, new VertexShader(gpu,'debug_normals.vert.wgsl', [{
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
    }]), new Shader(gpu,'color.frag.wgsl'), {
        primitive
    });
}] as const