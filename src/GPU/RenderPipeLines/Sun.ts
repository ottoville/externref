import { Shader, VertexShader } from "../RenderPipeline.js";
import { GPU } from "../../GPU.js";

export const SunRenderPipeline = ['SunRenderPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
    return gpu.positionBindGroupTimeWGSL.addRenderPipeline(
        {
            label,
            vertexShader: new VertexShader(gpu, 'sun.vert.wgsl', []),
            fragmentShader: new Shader(gpu, 'sun.frag.wgsl'),
            renderPipeline: {
                primitive
            },
            depthBuffer: { depthWriteEnabled: false, depthCompare: 'always' }
        }
    );
}] as const