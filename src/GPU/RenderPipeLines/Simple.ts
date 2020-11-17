import { GPU } from "../../GPU";
import { BoundableNode } from "../../TerraNode";
import { TerraScene } from "../../TerraScene";
import { worldPosition } from "../../traits/worldPosition";
import { RenderPipeline } from "../RenderPipeline";
const renderPipelines: Map<GPU, RenderPipeline> = new Map();

async function Simple(scene: TerraScene) {
    const [vertex, fragment] = await Promise.all(['/shaders/wgsl/simple.vert.wgsl', '/shaders/wgsl/simple.frag.wgsl'].map(async u => scene.gpuscene.device.createShaderModule({ code: await (await fetch(u)).text() })));
    const bindGroupLayout = scene.gpuscene.buildBindGroupHierarcy(scene.TerraCameras[0].baseBindGroupNoTime, scene.lights.uniformBindGroupLightsWGSL);
    const renderPipeLine = bindGroupLayout.addChildLayout(scene.gpuscene.BindGroupLayout).addRenderPipeline({
        rasterizationState: {
            cullMode: 'none',
        },
        primitiveTopology: 'triangle-list',
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
            indexFormat: 'uint32',
            vertexBuffers:
                [{
                    arrayStride: 3 * 4,
                    stepMode: "vertex",
                    attributes: [{
                        // position
                        shaderLocation: 0,
                        offset: 0,
                        format: "float3"
                    }]
                }]
        }
    });
    renderPipelines.set(scene.gpuscene, renderPipeLine);
    return renderPipeLine;
}
export abstract class SimpleMesh extends BoundableNode {
    worldPosition: worldPosition = new worldPosition(this);
    
    indicesBuffer?: SharedArrayBuffer | undefined;
    
    abstract vBuffer: GPUVertexBuffer;
    abstract iBuffer: GPUIndexBuffer;
    verticesPositionStride = 3;
    constructor(scene: TerraScene) {
        super(scene);
        
        (async () => {
            const renderPipeline = renderPipelines.get(scene.gpuscene) || (await Simple(scene));
            const m = renderPipeline.addDrawable([scene.gpuscene.renderPassScreen], 36);
            m.dynamicBuffers.set(scene.gpuscene.BindGroup, this.bufferOffsetBytes);
            m.setVertexBuffer(0, this.vBuffer);
            m.setIndexBuffer(this.iBuffer);

        })()
    }

}