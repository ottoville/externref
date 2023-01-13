import { PipelineLayout } from "../PipelineLayout.js";
import { Shader } from "./Shader.js";

export abstract class FragmentShader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
> extends Shader<E> {
    constructor(
        pipelineLayout: PipelineLayout,
        wgsl: string,
        entryPoints: E,
        label: string,
        ) {
            super(pipelineLayout, wgsl, entryPoints, label, GPUShaderStage.FRAGMENT)
    }
}
