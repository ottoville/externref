import { Shader, VertexShader } from "../RenderPipeline.js";
import { Engine } from "../../engine.js";
declare const engine:Engine;
export const WaterRenderPipeline = ['WaterRenderPipeline', function create(label:string,primitive: GPUPrimitiveState) {
    //TODO: Reuse sampler with terrain.ts?
    const sampler = engine.gpu.device.createSampler({
        magFilter: "nearest",
        minFilter: "nearest",
        mipmapFilter:"nearest"
    });
    return engine.gpu.bindGroupTextureWater.addRenderPipeline(label,
            new VertexShader(engine.gpu, 'water.vert.wgsl', [{
                arrayStride: 12,
                stepMode: 'vertex',
                attributes: [{
                    // position
                    shaderLocation: 0,
                    offset: 0,
                    format: "float32x3"
                }]
            }]),
            new Shader(engine.gpu, 'water.frag.wgsl'),
            {
                primitive,
            },undefined, () =>
            [
                {
                    binding: 0,
                    resource: sampler
                },
                {
                    binding: 1,
                    resource: engine.gpu.renderPassWater.renderTargets.diffuse.view.view
                }
            ]
        )
}] as const