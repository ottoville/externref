import type {
  FilteredBindgroupEntrys,
  VertexEntry,
  VertexShaderFunction,
} from './ShaderFunction.js';
import { OutputShader } from './OutputShader.js';
import { type ShaderParams, ShaderStage } from '../../webgpu-ts/Shader.js';
import type { PipelineLayout } from '../../GPU/PipelineLayout.js';

interface VertexAttribute extends GPUVertexAttribute {
  shaderFormat: string;
}

export interface VertexBufferLayout2<
  A extends { [index: string]: GPUVertexAttribute } = {
    [index: string]: VertexAttribute;
  },
> extends Omit<GPUVertexBufferLayout, 'attributes'> {
  /**
   * An array defining the layout of the vertex attributes within each element.
   */
  attributes2: A;
}

export class VertexShader<
  E extends {
    [index: string]: VertexShaderFunction;
  } = {
    [index: string]: VertexShaderFunction;
  },
  P extends readonly PipelineLayout[] = readonly PipelineLayout[],
> extends OutputShader<E> {
  constructor(
    //@ts-expect-error
    props: ShaderParams<E, P>,
    // Use bindgrouplayot of fist entrypoint to type constantCode bindgrouplayout
    constantCode?: (
      args: FilteredBindgroupEntrys<P[number]['bindGroupLayouts'], VertexEntry>,
    ) => string,
  ) {
    super(
      props,
      ShaderStage.VERTEX,
      //@ts-expect-error TODO
      constantCode,
    );
  }
}
