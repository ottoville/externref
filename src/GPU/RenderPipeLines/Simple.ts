import { GPU } from "../../GPU";
import { BoundableNode } from "../../TerraNode";
import { Scene } from "../../Scene";
import { worldPosition } from "../../traits/worldPosition";
import { RenderPipeline } from "../RenderPipeline";

const renderPipelines: Map<GPU, Promise<RenderPipeline>> = new Map();

async function Simple(scene: Scene) {

    const [vertex, fragment] = await Promise.all(['/shaders/wgsl/simple.vert.wgsl', '/shaders/wgsl/simple.frag.wgsl'].map(async u => scene.gpu.device.createShaderModule({ code: await (await fetch(u)).text() })));
    //const bindGroupLayout = scene.gpu.addBindGroup(scene.lights.uniformBindGroupLightsWGSL);

    return scene.positionBindGroupLightsTimeWGSL.addRenderPipeline({
        label: 'simple',
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
}
export abstract class SimpleMesh extends BoundableNode {
    worldPosition: worldPosition = new worldPosition(this);
    
    indicesBuffer?: SharedArrayBuffer | undefined;
    
    abstract vBuffer: GPUVertexBuffer;
    abstract iBuffer: GPUIndexBuffer;
    constructor(scene: Scene, verticesPositionBuffer: SharedArrayBuffer, indexFormat: GPUIndexFormat='uint32') {
        super(scene, verticesPositionBuffer, 3);
        
        (async () => {
            let cachePipeline: Promise<RenderPipeline> | undefined = renderPipelines.get(scene.gpu);
            if (!cachePipeline) {
                cachePipeline = Simple(scene);
                renderPipelines.set(scene.gpu, Simple(scene));
            }
            const renderPipeline = await cachePipeline;
            const m = renderPipeline.addDrawable(scene, [scene.gpu.renderPassScreen], 36);
            m.dynamicBuffers.set(scene.gpu.BindGroup, this.bufferOffsetBytes);
            m.setVertexBuffer(0, this.vBuffer);
            m.setIndexBuffer(this.iBuffer, undefined, undefined, indexFormat);

        })()
    }

}