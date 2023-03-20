import { BGLayout, BindGroupLayoutEntry, ShaderStage } from "../BindGroupLayout.js";
import { PipelineLayout } from "../PipelineLayout.js";
import { Shader, ShaderParams } from "./Shader.js";

export abstract class FragmentShader<
    B extends readonly BGLayout[] = readonly BGLayout[],
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout }
> extends Shader<E, B> {
    constructor(
        params: ShaderParams<E, B>
    ) {
        super(params, GPUShaderStage.FRAGMENT)
    }
    protected override createWGSL(cb: (...args: { [K in keyof B]: FilterFragment<B[K]["entries"]> }) => string) {
        return super.createWGSL(cb as unknown as (...args: { [K in keyof B]: B[K]["entries"] }) => string);
    }
}
type FilterFragment<T extends readonly unknown[]> = T extends [] ? [] :
    T extends readonly [infer H, ...infer R] ?
    H extends BindGroupLayoutEntry<ShaderStage.FRAGMENT | ShaderStage.COMPUTE_AND_FRAGMENT | ShaderStage.VERTEX_AND_FRAGMENT> ? [H, ...FilterFragment<R>] : FilterFragment<R> : T

