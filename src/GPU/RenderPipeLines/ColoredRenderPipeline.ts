import { createVertexColorShader } from "../Shaders/VertexColor.vert.js";
import { GPU } from "../../GPU.js";
import { simpleAttributes } from "./SimpleRenderPipeline.js";
import { VertexBufferLayout2 } from "../Shaders/VertexShader.js";

export const simpleAttributesWithColor = Object.freeze({
    ...simpleAttributes,
    color:
    {
        // color
        shaderLocation: 2,
        offset: 32,
        format: "float32x3",
        shaderFormat: 'vec3<f32>'
    }

} as const);

export const ColoredRenderPipeline = [
    'ColoredRenderPipeline', function SimpleRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: { stride: number }) {
        const buffers = {
            arrayStride: vertexBufferProps.stride * 4,
            stepMode: "vertex",
            attributes2: simpleAttributesWithColor
        } as VertexBufferLayout2<typeof simpleAttributesWithColor>
        const vertexShader = createVertexColorShader(gpu.positionAndTimeBindGroup, buffers)
        return gpu.positionAndTimeBindGroup.addRenderPipeline(
            {
                label,
                vertexShader,
                fragmentShader: gpu.simpleFragShader,
                renderPipeline: {
                    primitive,
                }
            });
    }
] as const