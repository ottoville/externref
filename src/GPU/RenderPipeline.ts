import type {
  RenderPipelineLayout,
  FragmentShader,
  RenderPipelineBuilder,
  VertexShader,
} from '../webgpu-ts/index.js';

type RenderPipelineProps<
  V extends VertexShader,
  F extends FragmentShader,
  R extends RenderPipelineLayout = RenderPipelineLayout,
> = {
  label: string;
  vertexShader: V;
  fragmentShader: F;
  descriptor: Omit<
    GPURenderPipelineDescriptor,
    'depthStencil' | 'fragmenst' | 'vertex' | 'layout'
  >;
  depthBuffer?: {
    depthWriteEnabled: boolean;
    depthCompare: GPUCompareFunction;
  };
  connections: Record<string, string>;
  bindgroupdrawable: R;
  builder: RenderPipelineBuilder;
};

export class LegacyRenderPipeline<
  V extends VertexShader = VertexShader,
  F extends FragmentShader = FragmentShader,
  R extends RenderPipelineLayout = RenderPipelineLayout,
> {
  public readonly props: RenderPipelineProps<V, F, R>;
  constructor(
    props: Readonly<
      RenderPipelineProps<V, F, R> & {
        connections: Record<
          keyof V['props']['entryPoints'],
          keyof F['props']['entryPoints']
        >;
      }
    >,
  ) {
    this.props = Object.freeze(props);
  }
  destroy(): void {
    Object.values(this.props.vertexShader.props.entryPoints).forEach(
      (entry) => {
        //@ts-expect-error
        entry.pipelineLayout.renderPipeLines.delete(this);
        //@ts-expect-error
        entry.pipelineLayout.renderPipelineListeners.forEach((cb) => cb());
      },
    );
  }
}
