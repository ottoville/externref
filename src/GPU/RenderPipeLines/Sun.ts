import { GPU } from '../../GPU.js';
import {  createSunVertShader } from '../Shaders/Sun.vert.js';
import { createSingleColorFragShader } from '../Shaders/SingleColor.frag.js';

export const SunRenderPipeline = [
    'SunRenderPipeline',
    function create(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
        const sunVertShader = createSunVertShader(gpu.positionAndTimeBindGroup);

        return gpu.positionAndTimeBindGroup.addRenderPipeline(
            {
                connections: {
                    'main': 'main',
                },
                depthBuffer: {
                    depthCompare: 'always', depthWriteEnabled: false,
                },
                fragmentShader: createSingleColorFragShader(gpu.positionAndTimeBindGroup),
                label,
                renderPipeline: {
                    primitive,
                },

                vertexShader: sunVertShader,
            }
        );
    }
] as const;