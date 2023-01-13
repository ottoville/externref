import { PipelineLayout } from "../PipelineLayout.js";
import { Shader, ShaderParams } from "./Shader.js";

export type VertexBuffers = [GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [];

export abstract class VertexShader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    BU extends VertexBuffers = VertexBuffers,
> extends Shader<E> {
    constructor(
        params: ShaderParams<E>,
        //Comsumed by GPURenderPipelineDescriptor
        public buffers: BU,
        ) {
            super(params, GPUShaderStage.VERTEX)
    }
}
