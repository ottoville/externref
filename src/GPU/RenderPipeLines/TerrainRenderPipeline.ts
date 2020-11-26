import { GPU } from "../../GPU";
import { BoundableNode } from "../../TerraNode";
import { TerraScene } from "../../TerraScene";
import { worldPosition } from "../../traits/worldPosition";
import { RenderPipeline } from "../RenderPipeline";
const renderPipelines: Map<GPU, RenderPipeline> = new Map();

async function TerrainRenderPipeline(scene: TerraScene, textureView: GPUTextureView) {
    const sampler = scene.gpuscene.device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
    });
    const [vertex, fragment] = await Promise.all(['/shaders/wgsl/ground.vert.wgsl', '/shaders/wgsl/ground.frag.wgsl'].map(async u => scene.gpuscene.device.createShaderModule({ code: await (await fetch(u)).text() })));
    const renderPipeLine = scene.lightsBindGroupTexture.addRenderPipeline({
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
    }, () => [
        {
            binding: 0,
            resource: sampler
        },
        {
            binding: 1,
            resource: textureView //this.texture.createView()
        }
    ]);;
    renderPipelines.set(scene.gpuscene, renderPipeLine);
    return renderPipeLine;
}
export class TerrainMesh extends BoundableNode {
    worldPosition?: worldPosition | undefined;
    constructor(
        scene: TerraScene,
        public textureView: GPUTextureView,
        public vBuffer: GPUVertexBuffer,
        public iBuffer: GPUIndexBuffer,
        public verticesPositionBuffer: SharedArrayBuffer,
        public indicesBuffer: SharedArrayBuffer,
        public verticesPositionStride = 3,
        indexCount:number
    ) {
        super(scene);
        
        (async () => {
            const renderPipeline = renderPipelines.get(scene.gpuscene) || (await TerrainRenderPipeline(scene, textureView));
            const m = renderPipeline.addDrawable([scene.gpuscene.renderPassScreen, scene.gpuscene.renderPassWater], indexCount, 1);
            m.setVertexBuffer(0, this.vBuffer);
            m.setIndexBuffer(this.iBuffer, 0, true, 'uint32');

        })()
    }

}