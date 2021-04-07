import type { GPU } from "../../GPU.js";
import { BoundableNode } from "../../TerraNode.js";
import type { Scene } from "../../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../RenderPipeline.js";
import type { DrawableIndexed } from "../Drawable.js";
const renderPipelines: Map<GPU, RenderPipeline> = new Map();



function TerrainRenderPipeline(gpu: GPU) {
    const renderPipeline = renderPipelines.get(gpu);
    if (renderPipeline)
        return renderPipeline;

    const renderPipeLine = gpu.lightsBindGroupTexture2.addRenderPipeline(new VertexShader(gpu,'ground.vert.wgsl', 'main', [{
        arrayStride: 48,
        stepMode: "vertex",
        attributes: [{
            // position
            shaderLocation: 0,
            offset: 0,
            format: "float32x3"
        },
        {
            // normals
            shaderLocation: 2,
            offset: 16,
            format: "float32x3"
        },
        {
            // uv
            shaderLocation: 1,
            offset: 32,
            format: "float32x2"
        }
        ]
    }]), new Shader(gpu,'ground.frag.wgsl'), {
        label: 'terrain',
        primitive: { topology: 'triangle-list' },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less",
            format: "depth24plus-stencil8",
        }
    });
    renderPipelines.set(gpu, renderPipeLine);
    return renderPipeLine;
}
export class TerrainMesh extends BoundableNode<DrawableIndexed> {
    sampler = this.engine.gpu.device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    })
    setTextureView = (textureview: GPUTextureView) => {
        this.Drawable.setStaticBuffer(this.sampler, textureview);
    }
    constructor(
        scene: Scene,
        public initialTexture: GPUTextureView,
        public vBuffer: GPUVertexBuffer,
        public iBuffer: GPUIndexBuffer,
        positionsCount: number,
        indicesView: Uint32Array,
        verticesPositionStride = 3
    ) {
        super(scene, TerrainRenderPipeline(scene.gpu), positionsCount, (node) => node.renderPipeline.addDrawableIndexed(scene, new Set([scene.gpu.renderPassScreen, scene.gpu.renderPassWater]), node, undefined, 0, 1), verticesPositionStride, indicesView);
        this.Drawable.dynamicBuffers.set(scene.gpu.BindGroupPosition, this.gpu_alignment);
        this.Drawable.setStaticBuffer(this.sampler, initialTexture);
        this.Drawable.setVertexBuffer(0, this.vBuffer);
        this.Drawable.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
    }

}