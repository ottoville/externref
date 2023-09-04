import {
  FilteredBindgroupEntrys,
  FragmentEntry,
  FragmentShaderFunction,
} from './ShaderFunction.js';
import {
  OutputShader,
  type ShaderParams,
  ShaderStage,
  type BGLayout,
} from '../../webgpu-ts/index.js';

export class FragmentShader<
  E extends { [index: string]: FragmentShaderFunction<readonly BGLayout[]> } = {
    [index: string]: FragmentShaderFunction<readonly BGLayout[]>;
  },
  //@ts-expect-error
> extends OutputShader<E> {
  constructor(
    //@ts-expect-error
    public override props: ShaderParams<E>,
    // Use bindgrouplayot of fist entrypoint to type constantCode bindgrouplayout
    constantCode?: (
      args: FilteredBindgroupEntrys<
        E[keyof E]['pipelineLayout']['bindGroupLayouts'],
        FragmentEntry
      >,
    ) => string,
  ) {
    super(
      props,
      ShaderStage.FRAGMENT,
      //@ts-expect-error TODO
      constantCode,
    );
  }
}
