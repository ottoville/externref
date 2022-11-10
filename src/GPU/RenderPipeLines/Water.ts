import { Shader, VertexShader } from "../RenderPipeline.js";
import type { GPU } from "../../GPU.js";
export const WaterRenderPipeline = ['WaterRenderPipeline', function create(gpu:GPU, label:string, primitive: GPUPrimitiveState) {
    //TODO: Reuse sampler with terrain.ts?
    const sampler = gpu.device.createSampler({
        magFilter: "nearest",
        minFilter: "nearest",
        mipmapFilter:"nearest"
    });
    return gpu.bindGroupTextureWater.addRenderPipeline(label,
            new VertexShader(gpu, 'water.vert.wgsl', [{
                arrayStride: 12,
                stepMode: 'vertex',
                attributes: [{
                    // position
                    shaderLocation: 0,
                    offset: 0,
                    format: "float32x3"
                }]
            }]),
            new Shader(gpu, 'water.frag.wgsl'),
            {
                primitive,
            },undefined, (bindGroup) =>
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
}] as const