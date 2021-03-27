import { BoundableNode } from "../TerraNode.js";
import type { Scene } from "../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../GPU/RenderPipeline.js";
import type { GPU } from "../GPU.js";
import { DrawableSimple } from "GPU/Drawable.js";

const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function getRenderPipeline(scene: Scene) {
    let renderPipeline: RenderPipeline | undefined = renderPipelines.get(scene.gpu);
    if (renderPipeline)
        return renderPipeline;

    //TODO: Reuse sampler with terrain.ts?
    const sampler = scene.gpu.device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    });
    const lightsBindGroupTextureWater = scene.gpu.rootSceneLayout.addChildLayout(scene.gpu.createBindGroupLayout({
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {

        }
    }, {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {

        }
    }, {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {

        }
    }, {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {

        }
    }));
    renderPipeline = lightsBindGroupTextureWater.addRenderPipeline(new VertexShader(scene.engine.gpu,'water.vert.wgsl'), new Shader(scene.engine.gpu,'water.frag.wgsl'), {
        primitive: { topology: 'triangle-strip', stripIndexFormat:'uint16' }
    }, () =>
        [
            {
                binding: 0,
                resource: sampler
            },
            {
                binding: 1,
                resource: scene.gpu.renderPassWater.renderTargets[0]!.view
            },
            {
                binding: 2,
                resource: scene.gpu.renderPassWater.renderTargets[1]!.view
            },
            {
                binding: 3,
                resource: scene.gpu.renderPassWater.renderTargets[2]!.view
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