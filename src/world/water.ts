import { BoundableNodeSimple } from "../DataNode.js";
import type { Scene } from "../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../GPU/RenderPipeline.js";
import type { GPU } from "../GPU.js";
import type { DrawableSimple } from "GPU/Drawable.js";
import type { Engine } from "engine.js";
declare const engine:Engine;

const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function getRenderPipeline(gpu: GPU) {
    let renderPipeline: RenderPipeline | undefined = renderPipelines.get(gpu);
    if (renderPipeline)
        return renderPipeline;

    //TODO: Reuse sampler with terrain.ts?
    const sampler = gpu.device.createSampler({
        magFilter: "nearest",
        minFilter: "nearest",
        mipmapFilter:"nearest"
    });
    const bindGroupTextureWater = gpu.positionBindGroupTimeWGSL.addChildLayout('water', gpu.createBindGroupLayout(
        'water',
        {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {
                type:'non-filtering'
            }
        }, {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
                sampleType:'unfilterable-float'
            }
        }, {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {

            }
        }
    ));
    renderPipeline = bindGroupTextureWater.addRenderPipeline(
        new VertexShader(gpu, 'water.vert.wgsl', 'main', [{
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
            primitive: {
                topology: 'triangle-strip',
                stripIndexFormat: 'uint16',
                frontFace:'cw'
            }
        },undefined, () =>
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
                resource: gpu.renderPassWater.renderTargets.diffuse.view
            }
        ]

    );
    renderPipelines.set(gpu, renderPipeline);
    return renderPipeline
}


export class Sea extends BoundableNodeSimple {
    drawable: DrawableSimple;
    constructor(scenes: Scene[]) {
        super(scenes, getRenderPipeline(engine.gpu),new Float32Array([-50000.0, 3.0, -50000.0,
            50000.0, 3.0, -50000.0,
            -50000.0, 3.0, 50000.0,
            50000.0, 3.0, 50000.0]), undefined, true,'water'); //48
        this.drawable = this.renderPipeline.addDrawableSimple(this, undefined, undefined, undefined, 'water');
        this.drawable.setVertexBuffer(0, new Float32Array([-50000.0, 3.0, -50000.0,
            50000.0, 3.0, -50000.0,
            -50000.0, 3.0, 50000.0,
            50000.0, 3.0, 50000.0]))
    }
}