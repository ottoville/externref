import { GPU } from "../../GPU.js";
import { SimpleVertShader } from "../Shaders/Simple.vert.js";
import { SimpleFragShader } from "../Shaders/Simple.frag.js";
export const SimpleRenderPipeline = [
    'SimpleRenderPipeline', function SimpleRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: { stride: number }) {
        const simpleVertShader = new SimpleVertShader(gpu.positionAndTimeBindGroup,
            {
                arrayStride: vertexBufferProps.stride * 4,
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