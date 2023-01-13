import { GPU } from "../../GPU.js";
import { GrassVertShader } from "../Shaders/Grass.vert.js";
import { ColorFragShader } from "../Shaders/Color.frag.js";

export const PlantsRenderPipeline = ['PlantsRenderPipeline', function PlantsRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
    const grassVertShader = new GrassVertShader(gpu.rootCameralayout, [
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
    ]);
    return gpu.rootCameralayout.addRenderPipeline(
        {
            label,
            vertexShader: grassVertShader,
            fragmentShader: new ColorFragShader(gpu.rootCameralayout),
            renderPipeline: {
                primitive
            }
        })
}] as const