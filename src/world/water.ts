import { VertexData } from "../lib/babylon/Meshes/mesh.vertexData";
import { TerraScene } from "../TerraScene";

export class Sea {
    constructor(scene: TerraScene, renderTexture: GPUTexture) {
        (async () => {

            const [vertex, fragment] = await Promise.all(['/shaders/wgsl/water.vert.wgsl', '/shaders/wgsl/water.frag.wgsl'].map(async u => scene.gpuscene.device.createShaderModule({ code: await(await fetch(u)).text() } )  ));
            //TODO: Reuse sampler with terrain.ts?
            const sampler = scene.gpuscene.device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
            });
            const waterPipeline = scene.gpuscene.lights.lightsBindGroupTexture.addRenderPipeline({
                sampleCount: scene.gpuscene.sampleCount,
                primitiveTopology: 'triangle-strip',
                colorStates: [{
                    format: "bgra8unorm",
                }],
                vertexStage: {
                    module: vertex,
                    entryPoint: "main",
                },
                fragmentStage: {
                    module: fragment,
                    entryPoint: "main"
                },
                vertexState: {
                    indexFormat: 'uint16' //todo: this is not needed as shader does not use indexes.
                }
            }, [
                {
                    binding: 0,
                    resource: sampler
                },
                {
                    binding: 1,
                    resource: renderTexture.createView()
                }
            ]);
            waterPipeline.addDrawable(new Set([scene.gpuscene.renderPassScreen]),4);
        })()
    }
}