import { Shader, VertexShader } from "../RenderPipeline.js";
import { GPU } from "../../GPU.js";

export const SunRenderPipeline = ['SunRenderPipeline', function create(gpu: GPU, label:string,primitive: GPUPrimitiveState) {
    return gpu.positionBindGroupTimeWGSL.addRenderPipeline(label,
        new VertexShader(gpu,'sun.vert.wgsl'),
        new Shader(gpu,'sun.frag.wgsl'),
        {
            primitive
    },{depthWriteEnabled:false, depthCompare:'always'});
}] as const