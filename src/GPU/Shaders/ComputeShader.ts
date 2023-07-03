import { BGLayout } from '../BindGroupLayout.js';
import { Shader, ShaderParams } from './Shader.js';
import type { ComputeEntry, ComputeShaderFunction, FilteredBindgroupEntrys } from './ShaderFunction.js';
export class ComputeShader<
    B extends readonly BGLayout[],
    E extends { [index: string]: ComputeShaderFunction<B> } = { [index: string]: ComputeShaderFunction<B> },
> extends Shader<E> {
    constructor(
        public override props: ShaderParams<E, B>,
        constantCode?: (args: FilteredBindgroupEntrys<B, ComputeEntry>) => string
    ) {
        super(props,
            GPUShaderStage.COMPUTE,
            //@ts-expect-error TODO
            constantCode);
    }
    createComputePipeline(entryPoint: keyof E) {
        return this.props.gpu.device.createComputePipelineAsync({
            compute: {
                entryPoint: entryPoint as string,
                module: this.module,
            },
            label: this.module.label + ' ' + (entryPoint as string),
            layout: this.props.entryPoints[entryPoint]!.pipelineLayout.layout,
        }).catch((err: unknown) => {
            throw (new Error('createComputePipelineAsync failed on ' + this.module.label + ' , wgsl:' + this.wgsl,
                { cause: err, }));
        });
    }
}

