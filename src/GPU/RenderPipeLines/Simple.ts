import { GPU } from "../../GPU";

export async function Simple(gpu: GPU) {
    const [vertex, fragment] = await Promise.all(['/shaders/wgsl/simple.vert.wgsl', '/shaders/wgsl/simple.frag.wgsl'].map(async u => gpu.device.createShaderModule({ code: await (await fetch(u)).text() })));
    const bindGroupLayout = gpu.buildBindGroupHierarcy(gpu.baseBindGroupNoTime, gpu.lights.uniformBindGroupLightsWGSL/*, gpu.BindGroup*/);
    return bindGroupLayout.addChildLayout(gpu.BindGroupLayout).addRenderPipeline({
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
}