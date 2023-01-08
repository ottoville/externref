import { Shader } from "../RenderPipeline.js";
import { GPU } from "../../GPU.js";
import { DebugBoundingBoxVertShader } from "../Shaders/debug_boundingbox.vert.js";

export const BoundingBoxPipeline = ['BoundingBoxPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
    const shader = new DebugBoundingBoxVertShader(gpu.worldUniformBindGroupLayouts, {
        arrayStride: 16,
        stepMode: "vertex",
        attributes: [{
            // position
            shaderLocation: 0,
            offset: 0,
            format: "float32x3"
        }
        ]
    });
    return gpu.positionBindGroupTimeWGSL.addRenderPipeline2(
        {
            label,
            vertexShader: shader,
            fragmentShader: new Shader(gpu, 'color.frag.wgsl'),
            renderPipeline: {
                primitive
            }
        }
    )
}] as const