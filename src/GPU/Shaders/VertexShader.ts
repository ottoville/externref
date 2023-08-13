import { BGLayout } from '../BindGroupLayout.js';
import type { ShaderParams } from './Shader.js';
import type {
  FilteredBindgroupEntrys,
  VertexEntry,
  VertexShaderFunction,
} from './ShaderFunction.js';
import { OutputShader } from './OutputShader.js';

export interface VertexAttribute extends GPUVertexAttribute {
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

export type VertexBuffers =
  | readonly [VertexBufferLayout2]
  | readonly [VertexBufferLayout2, VertexBufferLayout2]
  | readonly [VertexBufferLayout2, VertexBufferLayout2, VertexBufferLayout2]
  | readonly [];

export class VertexShader<
  E extends {
    [index: string]: VertexShaderFunction<readonly BGLayout[]>;
  } = {
    [index: string]: VertexShaderFunction<
      readonly BGLayout[],
      readonly VertexBufferLayout2[] | readonly []
    >;
  },
> extends OutputShader<E> {
  constructor(
    props: ShaderParams<E>,
    // Use bindgrouplayot of fist entrypoint to type constantCode bindgrouplayout
    constantCode?: (
      args: FilteredBindgroupEntrys<
        E[keyof E]['pipelineLayout']['bindGroupLayouts'],
        VertexEntry
      >,
    ) => string,
  ) {
    super(
      props,
      GPUShaderStage.VERTEX,
      //@ts-expect-error TODO
      constantCode,
    );
  }
}
