import { GPU } from "../../GPU.js";
import { DebugNormalsVertShader } from "../Shaders/debug_normals.vert.js";
import { ColorFragShader } from "../Shaders/Color.frag.js";

export const NormalsPipeline = [
    'NormalsPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
        const debugNormalsVertShader = new DebugNormalsVertShader(gpu.positionBindGroupTimeWGSL, {
            arrayStride: 48,
            stepMode: "vertex",
            attributes: [
                {
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
        });
        return gpu.positionBindGroupTimeWGSL.addRenderPipeline(
            {
                label,
                vertexShader: debugNormalsVertShader,
                fragmentShader: new ColorFragShader(gpu.positionBindGroupTimeWGSL),
                renderPipeline: {
                    primitive
                }
            })
    }
] as const