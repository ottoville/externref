import type { GPU } from '../../GPU';
import { createGroundVertShader } from '../Shaders/Ground.vert.js';
import { createGroundFragShader } from '../Shaders/Ground.frag.js';

const attributes = Object.freeze(
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
        },
        uv: {
            format: 'float32x2',
            offset: 32,
            shaderFormat: 'vec2<f32>',
            shaderLocation: 2,

        },
    } as const
);

export const TerrainRenderPipeline = [
    'TerrainRenderPipeline',
    function create(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: {
        stride: number;
    }) {
        const vertexShader = createGroundVertShader(gpu.lightsTextureBindGroup,
            {
                arrayStride: vertexBufferProps.stride * 4,
                attributes2: attributes,
                stepMode: 'vertex',
            }

        );
        const fragmentShader = createGroundFragShader(gpu.lightsTextureBindGroup);
        return gpu.lightsTextureBindGroup.addRenderPipeline(
            {
                connections: {
                    'main': 'main',
                    'pick': 'pick',
                },
                fragmentShader,
                label,
                renderPipeline: {
                    primitive,
                },
                vertexShader,

            });
    }
] as const;