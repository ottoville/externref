import { BoundableNode } from "../TerraNode";
import type { Scene } from "../Scene";

export class Sea extends BoundableNode {
    verticesPositionBuffer = new SharedArrayBuffer(4 * 4);
    verticesPositionStride = 4;
    worldPosition=undefined

    constructor(scene: Scene) {
        super(scene);
        (async () => {

            const [vertex, fragment] = await Promise.all(['/shaders/wgsl/water.vert.wgsl', '/shaders/wgsl/water.frag.wgsl'].map(async u => scene.gpu.device.createShaderModule({ code: await(await fetch(u)).text() } )  ));
            //TODO: Reuse sampler with terrain.ts?
            const sampler = scene.gpu.device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
            });
            const waterPipeline = scene.lightsBindGroupTexture.addRenderPipeline({
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
            }, () =>
                [
                    {
                        binding: 0,
                        resource: sampler
                    },
                    {
                        binding: 1,
                        resource: scene.gpu.renderPassWater.targetTextureView
                    }
                ]
            );
            waterPipeline.addDrawable(scene, [scene.gpu.renderPassScreen],4);
        })()
    }
}