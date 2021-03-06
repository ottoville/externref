import type { GPU } from "../../GPU.js";
import { BoundableNode } from "../../TerraNode.js";
import type { Scene } from "../../Scene.js";
import type { RenderPipeline } from "../RenderPipeline.js";
import type { DrawableIndexed } from "../Drawable.js";
const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function TerrainRenderPipeline(scene: Scene) {
    const renderPipeline = renderPipelines.get(scene.gpu);
    if (renderPipeline)
        return renderPipeline;
    const vertex = scene.engine.gpu.shaderModules.get('ground.vert.wgsl')
    const fragment = scene.engine.gpu.shaderModules.get('ground.frag.wgsl')
    if (!vertex || !fragment)
        throw ('Missing shader terrain')

    const renderPipeLine = scene.lightsBindGroupTexture.addRenderPipeline({
        label: 'terrain',
        primitiveTopology: 'triangle-list',
        depthStencilState: {
            depthWriteEnabled: true,
            depthCompare: "less",
            format: "depth24plus-stencil8",
        },
        vertexStage: {
            module: vertex,
            entryPoint: "main",
        },
        fragmentStage: {
            module: fragment,
            entryPoint: "main"
        },
        vertexState: {
            vertexBuffers:
                [{
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
                }]
        },
    });
    renderPipelines.set(scene.gpu, renderPipeLine);
    return renderPipeLine;
}
export class TerrainMesh extends BoundableNode {
    Drawable: DrawableIndexed;
    #textureview: GPUTextureView
    sampler: GPUSampler;
    set textureView(textureview: GPUTextureView) {
        this.#textureview = textureview;
        this.Drawable.setStaticBuffer(() => {
            return [
                {
                    binding: 0,
                    resource: this.sampler
                },
                {
                    binding: 1,
                    resource: this.#textureview
                }
            ]
        });
    }
    constructor(
        scene: Scene,
        initialTexture: GPUTextureView,
        public vBuffer: GPUVertexBuffer,
        public iBuffer: GPUIndexBuffer,
        positionsCount: number,
        indicesView: Uint32Array,
        verticesPositionStride = 3
    ) {
        super(scene, TerrainRenderPipeline(scene), positionsCount, verticesPositionStride, indicesView);
        this.sampler = scene.gpu.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });
        this.#textureview = initialTexture;
        this.Drawable = this.renderPipeline.addDrawableIndexed(scene, new Set([scene.gpu.renderPassScreen, scene.gpu.renderPassWater]), this, undefined, 0, 1);
        this.textureView=initialTexture;
        this.Drawable.setVertexBuffer(0, this.vBuffer);
        this.Drawable.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
    }

}