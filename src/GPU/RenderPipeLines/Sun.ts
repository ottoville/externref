import { Shader } from "../RenderPipeline.js";
import { GPU } from "../../GPU.js";
import { SunVertShader } from "../Shaders/Sun.vert.js";

export const SunRenderPipeline = ['SunRenderPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
    const sunVertShader = new SunVertShader(gpu.positionBindGroupTimeWGSL.bindGroupLayouts)
    return gpu.positionBindGroupTimeWGSL.addRenderPipeline(
        {
            label,
            vertexShader: sunVertShader,
            fragmentShader: new Shader(gpu, 'sun.frag.wgsl'),
            renderPipeline: {
                primitive
            },
            depthBuffer: { depthWriteEnabled: false, depthCompare: 'always' }
        }
    );
}] as const