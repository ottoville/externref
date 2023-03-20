import { BGLayout, BindGroupLayoutEntry, ShaderStage } from "../BindGroupLayout.js";
import type { PipelineLayout } from "../PipelineLayout.js";
import { Shader, ShaderParams } from "./Shader.js";
export abstract class ComputeShader<
    E extends { [index: string]: PipelineLayout },
    B extends readonly BGLayout[]
> extends Shader<E, B> {
    constructor(params: ShaderParams<E, B>) {
        super(params, GPUShaderStage.COMPUTE);
    }
    createComputePipeline(entryPoint: keyof E) {
        return this.props.gpu.device.createComputePipelineAsync({
            compute: {
                module: this.module,
                entryPoint: entryPoint as string
            },
            label: this.module.label + ' ' + (entryPoint as string),
            layout: this.props.entryPoints[entryPoint]!.layout
        }).catch((err: unknown) => {
            console.error('createComputePipelineAsync failed on,', this.module.label, ', wgsl:', this.wgsl, { cause: err })
            throw (new Error('createComputePipelineAsync failed', { cause: err }));
        });
    }
    protected override createWGSL(cb: (...args: { [K in keyof B]: FilterCompute<B[K]["entries"]> }) => string) {
        return super.createWGSL(cb as unknown as (...args: { [K in keyof B]: B[K]["entries"] }) => string);
    }
}
type FilterCompute<T extends readonly unknown[]> = T extends [] ? [] :
    T extends readonly [infer H, ...infer R] ?
    H extends BindGroupLayoutEntry<ShaderStage.COMPUTE | ShaderStage.COMPUTE_AND_VERTEX | ShaderStage.COMPUTE_AND_FRAGMENT> ? [H, ...FilterCompute<R>] : FilterCompute<R> : T

