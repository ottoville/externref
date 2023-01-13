import { GPU } from "../../GPU.js";
import { SimpleVertShader } from "../Shaders/Simple.vert.js";
import { SimpleFragShader } from "../Shaders/Simple.frag.js";

export const SimpleRenderPipeline = ['SimpleRenderPipeline', function SimpleRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
    const simpleVertShader = new SimpleVertShader(gpu.positionBindGroupTimeWGSL,
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
        });
    const simpleFragShader = new SimpleFragShader(gpu.positionBindGroupTimeWGSL);
    return gpu.positionBindGroupTimeWGSL.addRenderPipeline(
        {
            label,
            vertexShader: simpleVertShader,
            fragmentShader: simpleFragShader,
            renderPipeline: {
                primitive,
            }
        });
}] as const