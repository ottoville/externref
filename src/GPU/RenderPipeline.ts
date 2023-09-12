import type {
  FragmentShader,
  RenderPipelineBuilder,
  VertexShader,
} from '../webgpu-ts/index.js';

type RenderPipelineProps<V extends VertexShader, F extends FragmentShader> = {
  label: string;
  descriptor: Omit<
    GPURenderPipelineDescriptor,
    'depthStencil' | 'fragmenst' | 'vertex' | 'layout'
  >;
  depthBuffer?: {
    depthWriteEnabled: boolean;
    depthCompare: GPUCompareFunction;
  };
  connections: Record<string, string>;
  builder: RenderPipelineBuilder<V, F>;
};

export class LegacyRenderPipeline<
  V extends VertexShader = VertexShader,
  F extends FragmentShader = FragmentShader,
> {
  public readonly props: RenderPipelineProps<V, F>;
  constructor(
    props: Readonly<
      RenderPipelineProps<V, F> & {
        connections: Record<
          keyof V['props']['entryPoints'],
          keyof F['props']['entryPoints']
        >;
      }
    >,
  ) {
    this.props = Object.freeze(props);
  }
}
