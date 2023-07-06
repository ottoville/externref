import { GPU } from '../../GPU.js';
import { createDebugBoundingBoxVertShader } from '../Shaders/devtools/debug_boundingbox.vert.js';
const positionAttr = Object.freeze({
    position: {
        format: 'float32x3',
        offset: 0,
        shaderFormat: 'vec3<f32>',
        shaderLocation: 0,
    },
} as const);
export const DebugLinesPipeline = Object.freeze([
    'DebugLinesPipeline',
    function create(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: {
        stride: number;
    }) {
        const vertexShader = createDebugBoundingBoxVertShader(gpu.positionAndTimeBindGroup,
            {
                arrayStride: vertexBufferProps.stride * 4,
                attributes2: positionAttr,
                stepMode: 'vertex',
            });
        return gpu.positionAndTimeBindGroup.addRenderPipeline(
            {
                connections: {
                    'main': 'main',
                },
                fragmentShader: gpu.colorFragShader,
                label,
                renderPipeline: {
                    primitive,
                },
                vertexShader,
            }
        );
    }
] as const);