import type { PipelineLayout } from "../PipelineLayout.js";
import { Shader, ShaderParams } from "./Shader.js";
export abstract class ComputeShader<E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout }
> extends Shader<E> {
    constructor(params: ShaderParams<E>) {
        super(params, GPUShaderStage.COMPUTE)

    }
    createComputePipeline(entryPoint: keyof E) {
        return this.pipelineLayout.gpu.device.createComputePipelineAsync({
            compute: {
                module: this.module,
                entryPoint: entryPoint as string
            },
            label: this.module.label + ' ' + (entryPoint as string),
            layout: this.entryPoints[entryPoint]!.layout
        }).catch((err: unknown) => {
            console.error('createComputePipelineAsync failed on,',this.module.label,', wgsl:', this.wgsl, { cause: err })
            throw (new Error('createComputePipelineAsync failed', { cause: err }));
        });
    }
}
