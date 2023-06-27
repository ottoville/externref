import { GPU } from "../../GPU.js";
import { createSimpleVertShader } from "../Shaders/Simple.vert.js";

export const simpleAttributes = Object.freeze(
    {
        position: {
            shaderLocation: 0,
            offset: 0,
            format: "float32x3",
            shaderFormat: 'vec3<f32>'
        },
        normal: {
            shaderLocation: 1,
            offset: 16,
            format: "float32x3",
            shaderFormat: 'vec3<f32>'
        }
    } as const
);

export const SimpleRenderPipeline = [
    'SimpleRenderPipeline', function SimpleRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: { stride: number }) {
        const simpleVertShader = createSimpleVertShader(gpu.positionAndTimeBindGroup,
            {
                arrayStride: vertexBufferProps.stride * 4,
                stepMode: "vertex",
                attributes2: simpleAttributes
            });
        return gpu.positionAndTimeBindGroup.addRenderPipeline(
            {
                label,
                vertexShader: simpleVertShader,
                fragmentShader: gpu.simpleFragShader,
                renderPipeline: {
                    primitive,
                }
            });
    }
] as const