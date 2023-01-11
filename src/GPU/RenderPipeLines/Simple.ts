import { Shader } from "../RenderPipeline.js";
import { GPU } from "../../GPU.js";
import { SimpleVertShader } from "../Shaders/Simple.vert.js";

export const SimpleRenderPipeline = ['SimpleRenderPipeline', function SimpleRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
    const simpleVertShader = new SimpleVertShader(gpu.positionBindGroupTimeWGSL.bindGroupLayouts,
        {
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
        })
    return gpu.positionBindGroupTimeWGSL.addRenderPipeline2(
        {
            label,
            vertexShader: simpleVertShader,
            fragmentShader: new Shader(gpu, 'simple.frag.wgsl'),
            renderPipeline: {
                primitive,
            }
        });
}] as const