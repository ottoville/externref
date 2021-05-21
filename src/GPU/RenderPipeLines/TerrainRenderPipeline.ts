import type { GPU } from "../../GPU.js";
import { BoundableNodeIndexed } from "../../TerraNode.js";
import type { Scene } from "../../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../RenderPipeline.js";
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
        primitive: { topology: 'triangle-list' }
    });
    renderPipelines.set(gpu, renderPipeLine);
    return renderPipeLine;
}
export class TerrainMesh extends BoundableNodeIndexed {
    sampler = this.engine.gpu.device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    })
    setTextureView = (textureview: GPUTextureView) => {
        this.Drawable.setStaticBuffer(this.sampler, textureview);
    }
    Drawable = this.renderPipeline.addDrawableIndexed(this.scene, new Set([this.scene.gpu.renderPassScreen, this.scene.gpu.renderPassWater]), this, undefined, 0, 1);
    constructor(
        private scene: Scene,
        public initialTexture: GPUTextureView,
        public vBuffer: GPUVertexBuffer,
        public iBuffer: GPUIndexBuffer,
        positionsCount: number,
        indicesView: Uint32Array,
        verticesPositionStride = 3
    ) {
        super(scene, TerrainRenderPipeline(scene.gpu), positionsCount, verticesPositionStride, indicesView);
        this.Drawable.setStaticBuffer(this.sampler, initialTexture);
        this.Drawable.setVertexBuffer(0, this.vBuffer);
        this.Drawable.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
    }

}