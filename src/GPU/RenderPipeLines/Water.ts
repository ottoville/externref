import type { GPU } from "../../GPU.js";
import { WaterVertShader } from "../../GPU/Shaders/Water.vert.js";
import { WaterFragShader } from "../Shaders/Water.frag.js";
export const WaterRenderPipeline = [
    'WaterRenderPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState, vertexBufferProps: { stride: number }) {
        //TODO: Reuse sampler with terrain.ts?
        const sampler = gpu.device.createSampler({
            magFilter: "nearest",
            minFilter: "nearest",
            mipmapFilter: "nearest"
        });

        const waterVertShader = new WaterVertShader(gpu.bindGroupTextureWater, {
            arrayStride: vertexBufferProps.stride * 4,
            stepMode: 'vertex',
            attributes: [
                {
                    // position
                    shaderLocation: 0,
                    offset: 0,
                    format: "float32x3"
                }
            ]
        });
        return gpu.bindGroupTextureWater.addRenderPipeline(
            {
                label,
                vertexShader: waterVertShader,
                fragmentShader: new WaterFragShader(gpu.bindGroupTextureWater),
                renderPipeline: {
                    primitive,
                }
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