import { GPU } from "../../GPU.js";
import { createDebugNormalsVertShader } from "../Shaders/devtools/debug_normals.vert.js";
import { createColorFragmentShader } from "../Shaders/Color.frag.js";
import { simpleAttributes } from "./SimpleRenderPipeline.js";

export const NormalsPipeline = [
    'NormalsPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: {
        stride: number;
    }) {
        const debugNormalsVertShader = createDebugNormalsVertShader(gpu.positionAndTimeBindGroup, {
            arrayStride: vertexBufferProps.stride * 4,
            stepMode: "vertex",
            attributes2: simpleAttributes
        });
        return gpu.positionAndTimeBindGroup.addRenderPipeline(
            {
                label,
                vertexShader: debugNormalsVertShader,
                fragmentShader: createColorFragmentShader(gpu.positionAndTimeBindGroup),
                renderPipeline: {
                    primitive
                }
            })
    }
] as const