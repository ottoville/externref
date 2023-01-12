import type { BGLayout } from "../BindGroupLayout.js";
import { PipelineLayout } from "../PipelineLayout.js";
import type { GPU } from "../../GPU.js"
import { Shader } from "./Shader.js";

export abstract class FragmentShader<
    E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout },
    B extends readonly BGLayout[] = readonly BGLayout[],
> extends Shader<E, B> {
    constructor(
        gpu: GPU,
        bindLayouts: Readonly<B>,
        wgsl: string,
        entryPoints: E,
        label: string,
        ) {
            super(gpu, bindLayouts, wgsl, entryPoints, label, GPUShaderStage.FRAGMENT)
    }
}
