import { VertexData } from "../lib/babylon/Meshes/mesh.vertexData";
import { TerraScene } from "../TerraScene";

export class Sea {
    constructor(scene: TerraScene) {
        (async () => {

            const [vertex, fragment] = await Promise.all(['/shaders/wgsl/water.vert.wgsl', '/shaders/wgsl/water.frag'].map(async u => scene.gpuscene.device.createShaderModule({ code: await(await fetch(u)).text() } )  ));

            const waterPipeline = scene.gpuscene.lights.lightsBindGroupWGSL.addRenderPipeline({
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
            });
            waterPipeline.addDrawable(4);
        })()
    }
}