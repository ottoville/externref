import { BGLayout, BindGroupLayoutEntry, ShaderStage } from "../BindGroupLayout.js";
import { PipelineLayout } from "../PipelineLayout.js";
import { Shader, ShaderParams } from "./Shader.js";

export type VertexBuffers = [GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [];

export abstract class VertexShader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    BU extends VertexBuffers = VertexBuffers,
    B extends readonly BGLayout[] = readonly BGLayout[]
> extends Shader<E, B> {
    constructor(
        params: ShaderParams<E, B>,
        //Comsumed by GPURenderPipelineDescriptor
        public buffers: BU,
        ) {
            super(params, GPUShaderStage.VERTEX)
    }
    protected override createWGSL(cb: (...args: { [K in keyof B]: FilterVertex<B[K]["entries"]> }) => string) {
        return super.createWGSL(cb as unknown as (...args: { [K in keyof B]: B[K]["entries"] }) => string);
    }
}

type FilterVertex<T extends readonly unknown[]> = T extends [] ? [] :
T extends readonly [infer H, ...infer R] ?
H extends BindGroupLayoutEntry<ShaderStage.VERTEX | ShaderStage.COMPUTE_AND_VERTEX | ShaderStage.VERTEX_AND_FRAGMENT> ?  [H, ...FilterVertex<R>] : FilterVertex<R> : T

