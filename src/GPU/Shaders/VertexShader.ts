import { PipelineLayout } from "../PipelineLayout.js";
import { Shader } from "./Shader.js";

export type VertexBuffers = [GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [GPUVertexBufferLayout, GPUVertexBufferLayout, GPUVertexBufferLayout]
    | [];

export abstract class VertexShader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    BU extends VertexBuffers = VertexBuffers,
> extends Shader<E> {
    constructor(
        pipelineLayout: PipelineLayout,
        //Comsumed by GPURenderPipelineDescriptor
        public buffers: BU,
        wgsl: string,
        entryPoints: E,
        label: string,
        ) {
            super(pipelineLayout, wgsl, entryPoints, label, GPUShaderStage.VERTEX)
    }
}
