import { GPU } from "../../GPU";
import { BoundableNode } from "../../TerraNode";
import { Scene } from "../../Scene";
import { worldPosition } from "../../traits/worldPosition";
import { RenderPipeline } from "../RenderPipeline";
import { DrawableIndexed } from "../Drawable";
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
            vertexBuffers:
                [{
                    arrayStride: 4 * 8,
                    stepMode: "vertex",
                    attributes: [{
                        // position
                        shaderLocation: 0,
                        offset: 0,
                        format: "float3"
                    },
                    {
                        // uv
                        shaderLocation: 1,
                        offset: 4 * 3,
                        format: "float2"
                    },
                    {
                        // normals
                        shaderLocation: 2,
                        offset: 4 * 3 + 4 * 2,
                        format: "float3"
                    }]
                }]
        },
    }/*, () => [
        {
            binding: 0,
            resource: sampler
        },
        {
            binding: 1,
            resource: textureView //this.texture.createView()
        }
    ]*/);
    renderPipelines.set(scene.gpu, renderPipeLine);
    return renderPipeLine;
}
export class TerrainMesh extends BoundableNode {
    worldPosition?: worldPosition | undefined;
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
        verticesPositionBuffer: SharedArrayBuffer,
        indicesView: Uint32Array,
        verticesPositionStride = 3,
        public faces: SharedArrayBuffer,        
    ) {
        super(scene, TerrainRenderPipeline(scene), verticesPositionBuffer, verticesPositionStride, indicesView, faces);
        this.sampler = scene.gpu.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });
        this.#textureview = initialTexture;
        this.Drawable = this.renderPipeline.addDrawableIndexed(scene, new Set([scene.gpu.renderPassScreen, scene.gpu.renderPassWater]), this.verticesCount, undefined, 0, 1);
        this.textureView=initialTexture;
        this.Drawable.setVertexBuffer(0, this.vBuffer);
        this.Drawable.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
    }

}