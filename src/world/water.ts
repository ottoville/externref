import { BoundableNodeSimple } from "../TerraNode.js";
import type { Scene } from "../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../GPU/RenderPipeline.js";
import type { GPU } from "../GPU.js";

const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function getRenderPipeline(gpu: GPU) {
    let renderPipeline: RenderPipeline | undefined = renderPipelines.get(gpu);
    if (renderPipeline)
        return renderPipeline;

    //TODO: Reuse sampler with terrain.ts?
    const sampler = gpu.device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    });
    const bindGroupTextureWater = gpu.positionBindGroupTimeWGSL.addChildLayout(gpu.createBindGroupLayout({
        label:'water',
        entries: [
            {
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
            }
        ]
    }));
    renderPipeline = bindGroupTextureWater.addRenderPipeline(new VertexShader(gpu, 'water.vert.wgsl'), new Shader(gpu, 'water.frag.wgsl'), {
        primitive: { topology: 'triangle-strip', stripIndexFormat: 'uint16' }
    }, () =>
        [
            {
                binding: 0,
                resource: sampler
            },
            {
                binding: 1,
                resource: gpu.renderPassWater.renderTargets.normals.view
            },
            {
                binding: 2,
                resource: gpu.renderPassWater.renderTargets.position.view
            },
            {
                binding: 3,
                resource: gpu.renderPassWater.renderTargets.diffuse.view
            }
        ]

    );
    renderPipelines.set(gpu, renderPipeline);
    return renderPipeline
}


export class Sea extends BoundableNodeSimple {
    worldPosition = undefined
    constructor(scene: Scene) {
        super(scene, getRenderPipeline(scene.gpu), 4, (node) => node.renderPipeline.addDrawableSimple(scene, new Set([scene.gpu.renderPassScreen]), node,undefined,undefined,undefined,'water'),undefined,true); //48
    }
}