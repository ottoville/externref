import { Shader, VertexShader } from "../RenderPipeline.js";
import { GPU } from "../../GPU.js";

export const BoundingBoxPipeline = ['BoundingBoxPipeline',function create(gpu:GPU, label:string,primitive: GPUPrimitiveState) {
    return gpu.positionBindGroupTimeWGSL.addRenderPipeline(label,
    new VertexShader(gpu, 'debug_boundingbox.vert.wgsl', [{
        arrayStride: 16,
        stepMode: "vertex",
        attributes: [{
            // position
            shaderLocation: 0,
            offset: 0,
            format: "float32x3"
        }
        ]
    }]), new Shader(gpu, 'color.frag.wgsl'), {
    primitive
    })
}] as const