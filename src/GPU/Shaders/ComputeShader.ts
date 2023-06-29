import { BGLayout, BindGroupLayoutEntry, ShaderStage } from '../BindGroupLayout.js';
import { Shader, ShaderParams } from './Shader.js';
import type { ComputeShaderFunction } from './ShaderFunction.js';
export class ComputeShader<
    B extends readonly BGLayout[],
    E extends { [index: string]: ComputeShaderFunction<B> } = { [index: string]: ComputeShaderFunction<B> },
> extends Shader<E> {
    constructor(
        public override props: ShaderParams<E, B>,
        constantCode?: (...args: { [K in keyof B]: FilterCompute<B[K]['entries']> }) => string
    ) {
        super(props,
            GPUShaderStage.COMPUTE,
            //@ts-expect-error TODO
            constantCode);
        const bindGroups = this.getFilteredBindGroups(GPUShaderStage.COMPUTE) as { [K in keyof B]: FilterCompute<B[K]['entries']> };
        if (constantCode)
            this.wgsl += constantCode(...bindGroups)
        for (const key in props.entryPoints) {
            const entryPoint = props.entryPoints[key]!;
            this.wgsl += entryPoint.createCode(bindGroups,
                key);
        }
    }
    createComputePipeline(entryPoint: keyof E) {
        return this.props.gpu.device.createComputePipelineAsync({
            compute: {
                entryPoint: entryPoint as string,
                module: this.module,
            },
            label: this.module.label + ' ' + (entryPoint as string),
            layout: this.props.entryPoints[entryPoint]!.pipelineLayout.layout,
        }).catch((err: unknown) => {
            throw (new Error('createComputePipelineAsync failed on ' + this.module.label + ' , wgsl:' + this.wgsl,
                { cause: err, }));
        });
    }
}
export type FilterCompute<T extends readonly unknown[]> = T extends [] ? [] :
    T extends readonly [infer H, ...infer R] ?
    H extends BindGroupLayoutEntry<ShaderStage.COMPUTE | ShaderStage.COMPUTE_AND_VERTEX | ShaderStage.COMPUTE_AND_FRAGMENT> ? [H, ...FilterCompute<R>] : FilterCompute<R> : T

