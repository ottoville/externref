import { Shader, VertexShader } from "../RenderPipeline.js";
import { GPU } from "../../GPU.js";

export const PlantsRenderPipeline = ['PlantsRenderPipeline', function PlantsRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
    return gpu.rootCameralayout.addRenderPipeline(
        {
            label,
            vertexShader: new VertexShader(gpu, 'grass/grass.vert.wgsl', [
                {
                    arrayStride: 4 * 4,
                    stepMode: "instance",
                    attributes: [{ // position
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x4"
                    }]
                },
                {
                    arrayStride: 4 * 4,
                    stepMode: "instance",
                    attributes: [
                        {  // shape
                            shaderLocation: 1,
                            offset: 0,
                            format: "float32x4"
                        }
                    ]
                }, {
                    arrayStride: 12,
                    stepMode: 'vertex',
                    attributes: [{
                        // vertex position
                        shaderLocation: 2,
                        offset: 0,
                        format: "float32x3"
                    }]
                }
            ]),
            fragmentShader: new Shader(gpu, 'color.frag.wgsl'),
            renderPipeline: {
                primitive
            }
        })
}] as const