import type { PipelineLayout } from "../PipelineLayout.js";
import { Shader, ShaderParams } from "./Shader.js";
export abstract class ComputeShader<
E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
P extends PipelineLayout = PipelineLayout
> extends Shader<E, P> {
    constructor(params: ShaderParams<E, P>) {
        super(params, GPUShaderStage.COMPUTE)
    }
    createComputePipeline(entryPoint: keyof E) {
        return this.props.pipelineLayout.gpu.device.createComputePipelineAsync({
            compute: {
                module: this.module,
                entryPoint: entryPoint as string
            },
            label: this.module.label + ' ' + (entryPoint as string),
            layout: this.props.entryPoints[entryPoint]!.layout
        }).catch((err: unknown) => {
            console.error('createComputePipelineAsync failed on,',this.module.label,', wgsl:', this.wgsl, { cause: err })
            throw (new Error('createComputePipelineAsync failed', { cause: err }));
        });
    }
}
