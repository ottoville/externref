import { VertexColorShader } from "../Shaders/VertexColor.vert.js";
import { GPU } from "../../GPU.js";
import { simpleAttributes } from "./SimpleRenderPipeline.js";

const simpleAttributesWithColor = Object.freeze([
    ...simpleAttributes,
    {
        // color
        shaderLocation: 2,
        offset: 32,
        format: "float32x3"
    }
] as const);

export const ColoredRenderPipeline = [
    'ColoredRenderPipeline', function SimpleRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: {stride: number}) {
        const simpleVertShader = new VertexColorShader(gpu.positionAndTimeBindGroup,
            {
                arrayStride: vertexBufferProps.stride * 4,
                stepMode: "vertex",
                attributes: simpleAttributesWithColor
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