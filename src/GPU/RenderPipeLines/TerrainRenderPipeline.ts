import { GPU } from "../../GPU";
import { BoundableNode } from "../../TerraNode";
import { Scene } from "../../Scene";
import { worldPosition } from "../../traits/worldPosition";
import { RenderPipeline } from "../RenderPipeline";
import { Drawable } from "../Drawable";
const renderPipelines: Map<GPU, RenderPipeline> = new Map();

async function TerrainRenderPipeline(scene: Scene) {

    const [vertex, fragment] = await Promise.all(['/shaders/wgsl/ground.vert.wgsl', '/shaders/wgsl/ground.frag.wgsl'].map(async u => scene.gpu.device.createShaderModule({ code: await (await fetch(u)).text() })));
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
    drawable: Promise<Drawable>;
    #textureview: GPUTextureView
    sampler: GPUSampler;
    set textureView(textureview: GPUTextureView) {
        this.#textureview = textureview;
        this.drawable.then(d => d.setStaticBuffer(() => {
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
        }));
    }
    set scene(scene: Scene) {
        this.drawable.then(d => {
            d.scene = scene;
        });
    }
    constructor(
        scene: Scene,
        initialTexture: GPUTextureView,
        public vBuffer: GPUVertexBuffer,
        public iBuffer: GPUIndexBuffer,
        public verticesPositionBuffer: SharedArrayBuffer,
        public indicesBuffer: SharedArrayBuffer,
        verticesPositionStride = 3,
        indexCount: number,
        public faces: SharedArrayBuffer,        
    ) {
        super(scene, verticesPositionBuffer, verticesPositionStride);
        this.sampler = scene.gpu.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });
        this.#textureview = initialTexture;
        this.drawable = (async () => {
            const renderPipeline = renderPipelines.get(scene.gpu) || (await TerrainRenderPipeline(scene));
            const m = renderPipeline.addDrawable(scene, [scene.gpu.renderPassScreen, scene.gpu.renderPassWater], indexCount, 1);
            this.textureView=initialTexture;
            m.setVertexBuffer(0, this.vBuffer);
            m.setIndexBuffer(this.iBuffer, 0, true, 'uint32');
            return m;
        })();
    }

}