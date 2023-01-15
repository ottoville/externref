import { PipelineLayout } from "../PipelineLayout.js";
import { Shader, ShaderParams } from "./Shader.js";

export type VertexBuffers = [GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [];

export abstract class VertexShader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    BU extends VertexBuffers = VertexBuffers,
    P extends PipelineLayout = PipelineLayout
> extends Shader<E, P> {
    constructor(
        params: ShaderParams<E, P>,
        //Comsumed by GPURenderPipelineDescriptor
        public buffers: BU,
        ) {
            super(params, GPUShaderStage.VERTEX)
    }
}
