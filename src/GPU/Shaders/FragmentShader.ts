import { BGLayout, BindGroupLayoutEntry, ShaderStage } from '../BindGroupLayout.js';
import { Shader, ShaderParams } from './Shader.js';
import { FragmentShaderFunction } from './ShaderFunction.js';

export class FragmentShader<
    const B extends readonly BGLayout[] = readonly BGLayout[],
    E extends { [index: string]: FragmentShaderFunction<B> } = { [index: string]: FragmentShaderFunction<B> },
> extends Shader<E> {
    constructor(
        public override props: ShaderParams<E, B>,
        constantCode?: (...args: { [K in keyof B]: FilterFragment<B[K]['entries']> }) => string
    ) {
        super(props,
            GPUShaderStage.FRAGMENT,
            //@ts-expect-error TODO
            constantCode);
    }
}
export type FilterFragment<T extends readonly unknown[]> = T extends [] ? [] :
    T extends readonly [infer H, ...infer R] ?
    H extends BindGroupLayoutEntry<ShaderStage.FRAGMENT | ShaderStage.COMPUTE_AND_FRAGMENT | ShaderStage.VERTEX_AND_FRAGMENT> ? [H, ...FilterFragment<R>] : FilterFragment<R> : T

