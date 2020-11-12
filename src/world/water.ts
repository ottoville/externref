import { VertexData } from "../lib/babylon/Meshes/mesh.vertexData";
import { TerraNode } from "../TerraNode";
import { TerraScene } from "../TerraScene";
import { boundable, Bounding } from "../traits/Boundable";

export class Sea extends TerraNode implements boundable {
    bounding: Bounding;
    verticesPositionBuffer = new SharedArrayBuffer(4 * 4);
    verticesPositionStride = 4;
    worldPosition=undefined

    constructor(scene: TerraScene) {
        super(scene);
        this.bounding = new Bounding(this);
        (async () => {

            const [vertex, fragment] = await Promise.all(['/shaders/wgsl/water.vert.wgsl', '/shaders/wgsl/water.frag.wgsl'].map(async u => scene.gpuscene.device.createShaderModule({ code: await(await fetch(u)).text() } )  ));
            //TODO: Reuse sampler with terrain.ts?
            const sampler = scene.gpuscene.device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
            });
            const waterPipeline = scene.gpuscene.lights.lightsBindGroupTexture.addRenderPipeline({
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
                        resource: scene.gpuscene.renderPassWater.targetTextureView
                    }
                ]
            );
            waterPipeline.addDrawable([scene.gpuscene.renderPassScreen],4);
        })()
    }
}