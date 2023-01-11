import type { BGLayout } from "../BindGroupLayout.js";
import type { PipelineLayout } from "../PipelineLayout.js";
import type { GPU } from "../../GPU.js"
import { Shader } from "./Shader.js";
export abstract class ComputeShader<
B extends BGLayout[] = BGLayout[],
E extends { [index: string]: PipelineLayout } = { [index: string]: PipelineLayout }
> extends Shader<E, B> {
    constructor(gpu: GPU, bindLayouts: Readonly<B>, wgsl: string, label:string, entryPoints: E) {
        super(gpu, bindLayouts, wgsl, entryPoints, label, GPUShaderStage.COMPUTE)

    }
    createComputePipeline(entryPoint: keyof E) {
        return this.gpu.device.createComputePipelineAsync({
            compute: {
                module: this.module,
                entryPoint: entryPoint as string
            },
            label: this.module.label + ' ' + (entryPoint as string),
            layout: this.entryPoints[entryPoint]!.layout
        }).catch((err: unknown) => {
            console.error('createComputePipelineAsync failed on,',this.module.label,', wgsl:', this.wgsl, { cause: err })
            throw (new Error('createComputePipelineAsync failed', { cause: err }));
        });
    }
}
