import type { GPU } from "../../GPU.js";
import { BoundableNodeIndexed } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../RenderPipeline.js";
import type { DrawableIndexed } from "GPU/Drawable.js";
import type { Engine } from "engine.js";
declare const engine:Engine;
const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function TerrainRenderPipeline(gpu: GPU, entryPoint='main', topology:GPUPrimitiveTopology='triangle-list') {
    const renderPipeline = renderPipelines.get(gpu);
    if (renderPipeline)
        return renderPipeline;

    const renderPipeLine = gpu.lightsBindGroupTexture2.addRenderPipeline(new VertexShader(gpu,'ground.vert.wgsl', entryPoint, [{
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
    }]), new Shader(gpu,'ground.frag.wgsl',entryPoint), {
        label: 'terrain',
        primitive: { topology }
    });
    renderPipelines.set(gpu, renderPipeLine);
    return renderPipeLine;
}
export class TerrainMesh extends BoundableNodeIndexed {
    sampler = engine.gpu.device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    })
    setTextureView = (textureview: GPUTextureView) => {
        this.Drawable.setStaticBuffer(this.sampler, textureview);
    }
    Drawable:DrawableIndexed;
    constructor(
        scenes: Scene[],
        public initialTexture: GPUTextureView,
        public vBuffer: GPUVertexBuffer,
        public iBuffer: GPUIndexBuffer,
        vertices: Float32Array,
        indicesView: Uint32Array,
        verticesPositionStride = 3
    ) {
        super(scenes, TerrainRenderPipeline(engine.gpu), vertices, verticesPositionStride, indicesView,undefined,undefined,true);
        this.Drawable = this.renderPipeline.addDrawableIndexed(new Set([engine.gpu.renderPassScreen, engine.gpu.renderPassWater]), this, 'terrain', undefined, 0, 1);
        //@ts-expect-error
        window.debugTerrain=() => this.Drawable.debug_render_normals();
        this.Drawable.setStaticBuffer(this.sampler, initialTexture);
        this.Drawable.setVertexBuffer(0, this.vBuffer);
        this.Drawable.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
    }
}