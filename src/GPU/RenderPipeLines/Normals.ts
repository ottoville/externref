import { GPU } from '../../GPU.js';
import { createDebugNormalsVertShader } from '../Shaders/devtools/debug_normals.vert.js';
import { simpleAttributes } from './SimpleRenderPipeline.js';

export const NormalsPipeline = Object.freeze([
    'NormalsPipeline',
    function create(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: {
        stride: number;
    }) {
        const vertexShader = createDebugNormalsVertShader(gpu.positionAndTimeBindGroup,
            {
                arrayStride: vertexBufferProps.stride * 4,
                attributes2: simpleAttributes,
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
            });
    }
] as const);