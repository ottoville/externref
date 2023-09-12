import type {
  FragmentShader,
  RenderPipelineBuilder,
  VertexShader,
} from '../webgpu-ts/index.js';

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
