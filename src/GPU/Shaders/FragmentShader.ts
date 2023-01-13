import { PipelineLayout } from "../PipelineLayout.js";
import { Shader, ShaderParams } from "./Shader.js";

export abstract class FragmentShader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
> extends Shader<E> {
    constructor(
        params: ShaderParams<E>
        ) {
            super(params, GPUShaderStage.FRAGMENT)
    }
}
