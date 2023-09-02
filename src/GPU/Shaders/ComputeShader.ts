import {
  Shader,
  type ShaderParams,
  ShaderStage,
} from '../../webgpu-ts/Shader.js';
import type { BGLayout } from '../../webgpu-ts/BindgroupLayout.js';
import type {
  ComputeEntry,
  ComputeShaderFunction,
  FilteredBindgroupEntrys,
} from './ShaderFunction.js';
export class ComputeShader<
  E extends { [index: string]: ComputeShaderFunction<readonly BGLayout[]> } = {
    [index: string]: ComputeShaderFunction<readonly BGLayout[]>;
  },
  //@ts-expect-error
> extends Shader<E> {
  constructor(
    //@ts-expect-error
    public override props: ShaderParams<E>,
    constantCode?: (
      args: FilteredBindgroupEntrys<
        E[keyof E]['pipelineLayout']['bindGroupLayouts'],
        ComputeEntry
      >,
    ) => string,
  ) {
    super(
      props,
      ShaderStage.COMPUTE,
      //@ts-expect-error TODO
      constantCode,
    );
  }
  createComputePipeline(entryPoint: keyof E) {
    return this.props.gpu
      .createComputePipelineAsync({
        compute: {
          entryPoint: entryPoint as string,
          module: this.module,
        },
        label: this.module.label + ' ' + (entryPoint as string),
        layout: this.props.entryPoints[entryPoint]!.pipelineLayout.layout,
      })
      .catch((err: unknown) => {
        throw new Error(
          'createComputePipelineAsync failed on ' +
            this.module.label +
            ' , wgsl:' +
            this.wgsl,
          {
            cause: err,
          },
        );
      });
  }
}
