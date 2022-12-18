import type { ComputeShader } from "./Shaders/ComputeShader.js";

export class ComputePipeline2<C extends ComputeShader> {
    pipeline: GPUComputePipeline;
    constructor(
        shader: C,
        entryPoint: C extends ComputeShader<infer X> ? keyof X : never
    ) {
        this.pipeline = shader.gpu.device.createComputePipeline({
            compute: {
                module: shader.module,
                entryPoint: entryPoint as string
            },
            label: shader.module.label + ' ' + entryPoint,
            layout: shader.entryPoints[entryPoint]!.layout
        });
    }
}