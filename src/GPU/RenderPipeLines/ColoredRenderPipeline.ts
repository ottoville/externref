import { createVertexColorShader } from '../Shaders/VertexColor.vert.js';
import { GPU } from '../../GPU.js';
import { simpleAttributes } from './SimpleRenderPipeline.js';
import { VertexBufferLayout2 } from '../Shaders/VertexShader.js';

export const simpleAttributesWithColor = Object.freeze({
    ...simpleAttributes,
    color:
    {
        format: 'float32x3',
        offset: 32,
        shaderFormat: 'vec3<f32>',
        shaderLocation: 2,
    },

} as const);

export const ColoredRenderPipeline = [
    'ColoredRenderPipeline', function SimpleRenderPipeline(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: { stride: number }) {
        const buffers = {
            arrayStride: vertexBufferProps.stride * 4,
            attributes2: simpleAttributesWithColor,
            stepMode: 'vertex',
        } as VertexBufferLayout2<typeof simpleAttributesWithColor>
        const vertexShader = createVertexColorShader(gpu.positionAndTimeBindGroup, buffers)
        return gpu.positionAndTimeBindGroup.addRenderPipeline(
            {
                fragmentShader: gpu.simpleFragShader,
                label,
                renderPipeline: {
                    primitive,
                },
                vertexShader,
            });
    }
] as const