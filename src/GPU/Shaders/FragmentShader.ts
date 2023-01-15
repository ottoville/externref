import { PipelineLayout } from "../PipelineLayout.js";
import { Shader, ShaderParams } from "./Shader.js";

export abstract class FragmentShader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    P extends PipelineLayout = PipelineLayout
> extends Shader<E, P> {
    constructor(
        params: ShaderParams<E,P>
        ) {
            super(params, GPUShaderStage.FRAGMENT)
    }
}
