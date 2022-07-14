import { Shader, VertexShader } from "../RenderPipeline.js";
import { GPU } from "../../GPU.js";

export const SimpleRenderPipeline = ['SimpleRenderPipeline',function SimpleRenderPipeline(gpu:GPU, label:string, primitive: GPUPrimitiveState) {
    return gpu.positionBindGroupTimeWGSL.addRenderPipeline(label,
        new VertexShader(gpu, 'simple.vert.wgsl', [{
            arrayStride: 6 * 4,
            stepMode: "vertex",
            attributes: [{
                // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
            }, {
                // normals
                shaderLocation: 1,
                offset: 12,
                format: "float32x3"
            }]
        }]), new Shader(gpu, 'simple.frag.wgsl'), {
        primitive,
    });
}] as const