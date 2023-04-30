import { VertexColorShader } from "../Shaders/VertexColor.vert.js";
import { GPU } from "../../GPU.js";
import { SimpleFragShader } from "../Shaders/Simple.frag.js";

export const ColoredRenderPipeline = [
    'SimpleRenderPipeline', function SimpleRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
        const simpleVertShader = new VertexColorShader(gpu.positionAndTimeBindGroup,
            {
                arrayStride: 12 * 4,
                stepMode: "vertex",
                attributes: [
                    {
                        // position
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3",
                    }, {
                        // normals
                        shaderLocation: 1,
                        offset: 16,
                        format: "float32x3"
                    }, {
                        // color
                        shaderLocation: 2,
                        offset: 32,
                        format: "float32x3"
                    }
                ]
            });
        const simpleFragShader = new SimpleFragShader(gpu.positionAndTimeBindGroup);
        return gpu.positionAndTimeBindGroup.addRenderPipeline(
            {
                label,
                vertexShader: simpleVertShader,
                fragmentShader: simpleFragShader,
                renderPipeline: {
                    primitive,
                }
            });
    }
] as const