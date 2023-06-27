import { GPU } from '../../GPU.js';
import { createSimpleVertShader } from '../Shaders/Simple.vert.js';

export const simpleAttributes = Object.freeze(
    {
        normal: {
            format: 'float32x3',
            offset: 16,
            shaderFormat: 'vec3<f32>',
            shaderLocation: 1,
        },
        position: {
            format: 'float32x3',
            offset: 0,
            shaderFormat: 'vec3<f32>',
            shaderLocation: 0,
        }
    } as const
);

export const SimpleRenderPipeline = [
    'SimpleRenderPipeline', function SimpleRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: { stride: number }) {
        const simpleVertShader = createSimpleVertShader(gpu.positionAndTimeBindGroup,
            {
                arrayStride: vertexBufferProps.stride * 4,
                attributes2: simpleAttributes,
                stepMode: 'vertex',
            });
        return gpu.positionAndTimeBindGroup.addRenderPipeline(
            {
                fragmentShader: gpu.simpleFragShader,
                label,
                renderPipeline: {
                    primitive,
                },
                vertexShader: simpleVertShader,
            });
    }
] as const