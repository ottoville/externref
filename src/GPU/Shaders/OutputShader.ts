import {
  Shader,
  type ShaderParams,
  type ShaderStage,
} from '../../webgpu-ts/Shader.js';
import {
  FragmentShaderFunction,
  VertexShaderFunction,
} from './ShaderFunction.js';
import { Struct } from './structs/Structs.js';
import type { BindGroupLayoutEntry } from '../../webgpu-ts/BindgroupLayout.js';

type outputShaderFunction = VertexShaderFunction | FragmentShaderFunction;

/**
 * Shader that have output, use with vertex and fragment shader.
 */
export abstract class OutputShader<
  E extends { [index: string]: outputShaderFunction } = {
    [index: string]: outputShaderFunction;
  },
  //@ts-expect-error
> extends Shader<E> {
  constructor(
    //@ts-expect-error
    props: ShaderParams<E>,
    shaderFlag: ShaderStage,
    constantCode?:
      | ((
          b: Readonly<{
            [index: string]: BindGroupLayoutEntry;
          }>[],
        ) => string)
      | undefined,
  ) {
    const outputs: Set<Struct> = new Set();
    for (const key in props.entryPoints) {
      const entryPoint = props.entryPoints[key]!;
      outputs.add(entryPoint.output);
    }
    super(props, shaderFlag, constantCode, outputs);
  }
}
