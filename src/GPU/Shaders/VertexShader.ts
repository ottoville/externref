import { BGLayout, BindGroupLayoutEntry, ShaderStage } from "../BindGroupLayout.js";
import { Shader, type ShaderParams } from "./Shader.js";
import type { VertexShaderFunction } from "./ShaderFunction.js";

export interface VertexAttribute extends GPUVertexAttribute {
    shaderFormat: string;
}

export interface VertexBufferLayout2<A extends {[index: string]: GPUVertexAttribute} = {[index: string]: VertexAttribute}> extends Omit<GPUVertexBufferLayout, 'attributes'> {
    /**
     * An array defining the layout of the vertex attributes within each element.
     */
    attributes2: A;
  }

// eslint-disable-next-line @typescript-eslint/no-shadow
type Head<T extends readonly BGLayout[]> = T extends [ ...infer Head, BGLayout ] ? Head : never[];

export type VertexBuffers = readonly [VertexBufferLayout2]
    | readonly [VertexBufferLayout2, VertexBufferLayout2]
    | readonly [VertexBufferLayout2, VertexBufferLayout2, VertexBufferLayout2]
    | readonly [];

export class VertexShader<
    B extends readonly BGLayout[] = readonly BGLayout[],
    E extends { [index: string]:  VertexShaderFunction<
        /**
         * Function must have same bindgrouplayouts than pipelineLayout,
         * but not every one of then must be defined for shader. Eg. it is allowed to attach shader
         * with less or no bindgrouplayout, but it is not allowed to attach shader with different or more
         * bindgrouplayouts than the pipelineLayout has.
        */
        B|Head<B>|Head<Head<B>>|Head<Head<Head<B>>>|Head<Head<Head<Head<B>>>>|Head<Head<Head<Head<Head<B>>>>>|readonly never []
        , readonly VertexBufferLayout2[] | (readonly [])> } = { [index: string]:  VertexShaderFunction<B, readonly VertexBufferLayout2[] | (readonly [])> },
> extends Shader<E> {

    constructor(
        props: ShaderParams<E, B>,
        constantCode?: (...args: { [K in keyof B]: FilterVertex<B[K]["entries"]> }) => string,
    ) {
        //@ts-expect-error TODO
        super(props, GPUShaderStage.VERTEX, constantCode);
    }
}

export type FilterVertex<T extends readonly unknown[]> = T extends [] ? [] :
    T extends readonly [infer H, ...infer R] ?
    H extends BindGroupLayoutEntry<ShaderStage.VERTEX | ShaderStage.COMPUTE_AND_VERTEX | ShaderStage.VERTEX_AND_FRAGMENT> ? [H, ...FilterVertex<R>] : FilterVertex<R> : T

