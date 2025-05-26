import { RenderPass, RenderPassProps } from './RenderPass.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import type {
  ColorRenderTarget,
  DepthRenderTarget,
  RenderPipelineBuilderDesc,
} from '../../webgpu-ts/index.js';
import type { GPU } from '../../GPU.js';

export class DepthRenderPass<
  T extends {
    [index: string]: ColorRenderTarget;
  } = {
    [index: string]: ColorRenderTarget;
  },
  E extends string = string,
> extends RenderPass<T, E> {
  depthRenderTarget: DepthRenderTarget;
  constructor(
    renderPassProps: RenderPassProps<T, E>,
    depthRenderTarget: DepthRenderTarget,
    gpu: GPU,
  ) {
    renderPassProps.depthStencilAttachment = depthRenderTarget;
    renderPassProps.GPURenderBundleEncoderDescriptor = {
      depthStencilFormat: depthRenderTarget.renderTarget.texture.props.format,
    };
    super(renderPassProps, gpu);
    this.depthRenderTarget = depthRenderTarget;
  }
  override resize(width: number, height: number) {
    super.resize(width, height);
    this.depthRenderTarget.resize(this.size, this.props.sampleCount);
  }
  override onDecoratePipeline = (
    renderpipeline: RenderPipelineProps,
    renderPipelineDescriptor: RenderPipelineBuilderDesc,
  ) => {
    renderPipelineDescriptor.depthStencil = {
      depthCompare: renderpipeline.depthBuffer?.depthCompare ?? 'greater',
      depthWriteEnabled: renderpipeline.depthBuffer?.depthWriteEnabled ?? true,
      format: this.depthRenderTarget.renderTarget.texture.props.format,
    };
  };
}
