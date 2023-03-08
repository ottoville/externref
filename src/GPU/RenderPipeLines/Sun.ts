import { GPU } from "../../GPU.js";
import { SunVertShader } from "../Shaders/Sun.vert.js";
import { SingleColorFragShader } from "../Shaders/SingleColor.frag.js";

export const SunRenderPipeline = [
    'SunRenderPipeline', function create(gpu: GPU, label: string, primitive: GPUPrimitiveState) {
        const sunVertShader = new SunVertShader(gpu.positionAndTimeBindGroup)
        return gpu.positionAndTimeBindGroup.addRenderPipeline(
            {
                label,
                vertexShader: sunVertShader,
                fragmentShader: new SingleColorFragShader(gpu.positionAndTimeBindGroup),
                renderPipeline: {
                    primitive
                },
                depthBuffer: { depthWriteEnabled: false, depthCompare: 'always' }
            }
        );
    }
] as const