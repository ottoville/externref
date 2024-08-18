import type {
  FragmentShader,
  FragmentShaderBuilder,
  RenderPipelineBuilder,
  VertexShader,
  VertexShaderBuilder,
} from '../webgpu-ts/index.js';
export type RenderPipelineProps0<
  V extends VertexShaderBuilder | VertexShader =
    | VertexShaderBuilder
    | VertexShader,
  F extends FragmentShaderBuilder | FragmentShader =
    | FragmentShaderBuilder
    | FragmentShader,
  P extends GPUPrimitiveState = GPUPrimitiveState,
> = Readonly<{
  primitive?: P;
  depthBuffer?: {
    depthWriteEnabled: boolean;
    depthCompare: GPUCompareFunction;
  };
  connections: Record<
    keyof V['entryPoints'] & string,
    keyof F['entryPoints'] & string
  >;
}>;
export type RenderPipelineProps<
  V extends VertexShader = VertexShader,
  F extends FragmentShader = FragmentShader,
> = Readonly<{
  label: string;
  primitive?: GPUPrimitiveState;
  depthBuffer?: {
    depthWriteEnabled: boolean;
    depthCompare: GPUCompareFunction;
  };
  connections: Record<
    keyof V['props']['entryPoints'] & string,
    keyof F['props']['entryPoints'] & string
  >;
  builder: RenderPipelineBuilder<V, F>;
}>;
