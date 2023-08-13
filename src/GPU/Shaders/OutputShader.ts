import { BindGroupLayoutEntry } from '../BindGroupLayout.js';
import { Shader, ShaderParams } from './Shader.js';
import {
  FragmentShaderFunction,
  VertexShaderFunction,
} from './ShaderFunction.js';
import { Struct } from './structs/Structs.js';

type outputShaderFunction = VertexShaderFunction | FragmentShaderFunction;

/**
 * Shader that have output, use with vertex and fragment shader.
 */
export abstract class OutputShader<
  E extends { [index: string]: outputShaderFunction } = {
    [index: string]: outputShaderFunction;
  },
> extends Shader<E> {
  constructor(
    props: ShaderParams<E>,
    shaderFlag:
      | typeof GPUShaderStage.VERTEX
      | typeof GPUShaderStage.FRAGMENT
      | typeof GPUShaderStage.COMPUTE,
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
