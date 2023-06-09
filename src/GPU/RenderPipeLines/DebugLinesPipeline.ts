import { GPU } from "../../GPU.js";
import { DebugBoundingBoxVertShader } from "../Shaders/devtools/debug_boundingbox.vert.js";
import { ColorFragShader } from "../Shaders/Color.frag.js";

export const DebugLinesPipeline = [
    'DebugLinesPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: {
        stride: number;
    }) {
        const shader = new DebugBoundingBoxVertShader(gpu.positionAndTimeBindGroup, {
            arrayStride: vertexBufferProps.stride * 4,
            stepMode: "vertex",
            attributes: [
                {
                    // position
                    shaderLocation: 0,
                    offset: 0,
                    format: "float32x3"
                }
            ]
        });
        return gpu.positionAndTimeBindGroup.addRenderPipeline(
            {
                label,
                vertexShader: shader,
                fragmentShader: new ColorFragShader(gpu.positionAndTimeBindGroup),
                renderPipeline: {
                    primitive
                }
            }
        )
    }
] as const