import type { GPU } from "../../GPU.js";
import { BoundableNodeIndexed } from "../../DataNode.js";
import type { Scene } from "../../Scene.js";
import { RenderPipeline, Shader, VertexShader } from "../RenderPipeline.js";
import type { DrawableIndexed } from "../Drawable.js";
import type { Engine } from "../../engine.js";
declare const engine:Engine;
const renderPipelines: Map<GPU, RenderPipeline> = new Map();

export class TerrainMesh extends BoundableNodeIndexed {
    sampler = engine.gpu.device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    })
    setTextureView = (textureview: GPUTextureView) => {
        this.drawable.setStaticBuffer(this.sampler, textureview);
    }
    drawable:DrawableIndexed;
    constructor(
        scenes: Scene[],
        public initialTexture: GPUTextureView,
        public vBuffer: GPUVertexBuffer,
        public iBuffer: GPUIndexBuffer,
        vertices: Float32Array,
        indicesView: Uint32Array,
        verticesPositionStride = 3
    ) {
        super(vertices, verticesPositionStride, indicesView,true,undefined,undefined,true,'terrain',scenes);
        let renderPipeline = renderPipelines.get(engine.gpu);
        if (!renderPipeline) {
            renderPipeline = engine.gpu.lightsBindGroupTexture2.addRenderPipeline('TerrainRenderPipeline',new VertexShader(engine.gpu,'ground.vert.wgsl',  [
                {
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
            }
            ]), new Shader(engine.gpu,'ground.frag.wgsl'), {
                primitive: { topology:'triangle-list' }
            });
            renderPipelines.set(engine.gpu, renderPipeline);
        }
        this.drawable = renderPipeline.addDrawableIndexed(this, new Set([engine.gpu.renderPassScreen, engine.gpu.renderPassWater, engine.gpu.pickRenderPass]), undefined, 0, 1);
        //@ts-expect-error
        window.debugTerrain=() => this.drawable.debug_render_normals(this);
        this.drawable.setStaticBuffer(this.sampler, initialTexture);
        this.drawable.setVertexBuffer(0, this.vBuffer);
        this.drawable.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
    }
}