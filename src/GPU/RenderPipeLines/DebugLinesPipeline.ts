import { GPU } from "../../GPU.js";
import { createDebugBoundingBoxVertShader } from "../Shaders/devtools/debug_boundingbox.vert.js";
import { createColorFragmentShader } from "../Shaders/Color.frag.js";
const positionAttr = Object.freeze({
    position: {
        shaderLocation: 0,
        offset: 0,
        format: "float32x3",
        shaderFormat: "vec3<f32>"
    }
} as const)
export const DebugLinesPipeline = [
    'DebugLinesPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: {
        stride: number;
    }) {
        const shader = createDebugBoundingBoxVertShader(gpu.positionAndTimeBindGroup, {
            arrayStride: vertexBufferProps.stride * 4,
            stepMode: "vertex",
            attributes2: positionAttr
        });
        return gpu.positionAndTimeBindGroup.addRenderPipeline(
            {
                label,
                vertexShader: shader,
                fragmentShader: createColorFragmentShader(gpu.positionAndTimeBindGroup),
                renderPipeline: {
                    primitive
                }
            }
        )
    }
] as const