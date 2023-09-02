import { type ShaderParams } from './Shader.js';
import {
  FilteredBindgroupEntrys,
  FragmentEntry,
  FragmentShaderFunction,
} from './ShaderFunction.js';
import { OutputShader } from './OutputShader.js';
import { BGLayout } from '../../webgpu-ts/BindgroupLayout.js';
import { ShaderStage } from 'webgpu-ts/Shader.js';

export class FragmentShader<
  E extends { [index: string]: FragmentShaderFunction<readonly BGLayout[]> } = {
    [index: string]: FragmentShaderFunction<readonly BGLayout[]>;
  },
> extends OutputShader<E> {
  constructor(
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
