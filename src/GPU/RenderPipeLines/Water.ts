import type { GPU } from '../../GPU.js';
import { createWaterVertShader, positionAttr } from '../../GPU/Shaders/Water.vert.js';
import { WaterFragShader } from '../Shaders/Water.frag.js';

export const WaterRenderPipeline = [
    'WaterRenderPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: { stride: number }) {
        //TODO: Reuse sampler with terrain.ts?
        const sampler = gpu.device.createSampler({
            magFilter: 'nearest',
            minFilter: 'nearest',
            mipmapFilter: 'nearest'
        });

        const waterVertShader = createWaterVertShader(gpu.bindGroupTextureWater, {
            arrayStride: vertexBufferProps.stride * 4,
            attributes2: positionAttr,
            stepMode: 'vertex',
        });
        return gpu.bindGroupTextureWater.addRenderPipeline(
            {
                fragmentShader: new WaterFragShader(gpu.bindGroupTextureWater),
                label,
                renderPipeline: {
                    primitive,
                },
                vertexShader: waterVertShader,
            },
            (bindGroup) =>
                [
                    {
                        binding: 0,
                        resource: sampler
                    },
                    {
                        binding: 1,
                        resource: gpu.renderPassWater.colorRenderTargets.diffuse.view.getTextureBinding(bindGroup)
                    }
                ]
        )
    }
] as const