import { Shader, VertexShader } from "../RenderPipeline.js";
import { Engine } from "../../engine.js";
declare const engine:Engine;

export const SimpleRenderPipeline = ['SimpleRenderPipeline',function SimpleRenderPipeline(label:string, primitive: GPUPrimitiveState) {
    if(!engine.gpu)
        return;
    return engine.gpu.positionBindGroupTimeWGSL.addRenderPipeline(label,
        new VertexShader(engine.gpu, 'simple.vert.wgsl', [{
            arrayStride: 6 * 4,
            stepMode: "vertex",
            attributes: [{
                // position
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
            }, {
                // normals
                shaderLocation: 1,
                offset: 12,
                format: "float32x3"
            }]
        }]), new Shader(engine.gpu, 'simple.frag.wgsl'), {
        primitive,
    });
}] as const