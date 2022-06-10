import { Shader, VertexShader } from "../RenderPipeline.js";
import { Engine } from "../../engine.js";
declare const engine:Engine;

export const SunRenderPipeline = ['SunRenderPipeline', function create(label:string,primitive: GPUPrimitiveState) {
    if(!engine.gpu)
        return;
    return engine.gpu.positionBindGroupTime.addRenderPipeline(label,
        new VertexShader(engine.gpu,'sun.vert.wgsl'),
        new Shader(engine.gpu,'sun.frag.wgsl'),
        {
            primitive
    },{depthWriteEnabled:false, depthCompare:'always'});
}] as const