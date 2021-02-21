import type { GPU } from "../../GPU.js";
import { BoundableNode } from "../../TerraNode.js";
import type { Scene } from "../../Scene.js";
import type { RenderPipeline } from "../RenderPipeline.js";

const renderPipelines: Map<GPU, RenderPipeline> = new Map();

function Simple(scene: Scene) {
    let renderPipeline: RenderPipeline | undefined = renderPipelines.get(scene.gpu);
    if (renderPipeline)
        return renderPipeline;
    const vertex = scene.engine.gpu.shaderModules.get('simple.vert.wgsl')
    const fragment = scene.engine.gpu.shaderModules.get('simple.frag.wgsl')
    if (!vertex || !fragment)
        throw('Missing shader')
    //const [vertex, fragment] = await Promise.all(['/shaders/wgsl/simple.vert.wgsl', '/shaders/wgsl/simple.frag.wgsl'].map(async u => scene.gpu.device.createShaderModule({ code: await (await fetch(u)).text() })));
    //const bindGroupLayout = scene.gpu.addBindGroup(scene.lights.uniformBindGroupLightsWGSL);

    renderPipeline= scene.positionBindGroupLightsTimeWGSL.addRenderPipeline({
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
    renderPipelines.set(scene.gpu, renderPipeline);
    return renderPipeline
}
export abstract class SimpleMesh extends BoundableNode {
    
    Drawable = this.renderPipeline.addDrawableIndexed(this.scene, new Set([this.scene.gpu.renderPassScreen]), this);
    constructor(
        private scene: Scene,
        positionsCount: number,
        indicesView: Uint32Array | Uint16Array,
        iBuffer: GPUIndexBuffer,
        vBuffer: GPUVertexBuffer) {

        super(scene, Simple(scene), positionsCount, 3, indicesView);
        this.Drawable.dynamicBuffers.set(scene.gpu.BindGroup, this.bufferOffsetBytes);
        this.Drawable.setVertexBuffer(0, vBuffer);
        this.Drawable.setIndexBuffer(iBuffer, undefined, undefined, indicesView.BYTES_PER_ELEMENT == 4 ? 'uint32' : 'uint16');

    }
}