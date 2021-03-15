import { BoundableNode } from "../TerraNode.js";
import type { Scene } from "../Scene.js";
import type { RenderPipeline } from "../GPU/RenderPipeline.js";
import type { GPU } from "../GPU.js";
import { DrawableSimple } from "GPU/Drawable.js";

const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function getRenderPipeline(scene: Scene) {
    let renderPipeline: RenderPipeline | undefined = renderPipelines.get(scene.gpu);
    if (renderPipeline)
        return renderPipeline;
    const vertex = scene.engine.gpu.shaderModules.get('water.vert.wgsl')
    const fragment = scene.engine.gpu.shaderModules.get('water.frag.wgsl')
    if (!vertex || !fragment)
        throw ('Missing shader')
    //const [vertex, fragment] = await Promise.all(['/shaders/wgsl/simple.vert.wgsl', '/shaders/wgsl/simple.frag.wgsl'].map(async u => scene.gpu.device.createShaderModule({ code: await (await fetch(u)).text() })));
    //const bindGroupLayout = scene.gpu.addBindGroup(scene.lights.uniformBindGroupLightsWGSL);

    //TODO: Reuse sampler with terrain.ts?
    const sampler = scene.gpu.device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    });
    renderPipeline = scene.lightsBindGroupTexture.addRenderPipeline({
        primitiveTopology: 'triangle-strip',
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
                resource: scene.gpu.renderPassWater.renderTargets[0]!.view
            }
        ]

    );
    renderPipelines.set(scene.gpu, renderPipeline);
    return renderPipeline
}


export class Sea extends BoundableNode<DrawableSimple> {
    worldPosition = undefined
    constructor(scene: Scene) {
        super(scene, getRenderPipeline(scene), 4, (node) => node.renderPipeline.addDrawableSimple(scene, new Set([scene.gpu.renderPassScreen]), node), undefined, undefined, true); //48
    }
}