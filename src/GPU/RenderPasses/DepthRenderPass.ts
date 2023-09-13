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
> extends RenderPass<T> {
  depthRenderTarget: DepthRenderTarget;
  constructor(
    renderPassProps: RenderPassProps<T>,
    depthRenderTarget: DepthRenderTarget,
    gpu: GPU,
  ) {
    renderPassProps.GPURenderBundleEncoderDescriptor = {
      depthStencilFormat: depthRenderTarget.props.format,
    };
    super(renderPassProps, gpu);
    this.depthRenderTarget = depthRenderTarget;
  }
  override resize(width: number, height: number) {
    super.resize(width, height);
    this.depthRenderTarget.resize(this.size, this.props.sampleCount);
  }
  override get GPURenderPassDescriptor(): GPURenderPassDescriptor {
    const renderPassDescriptor = super.GPURenderPassDescriptor;

    renderPassDescriptor.depthStencilAttachment = {
      depthClearValue: this.depthRenderTarget.clearValue,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
      view: this.depthRenderTarget.view.getAsRenderTarget(this),
    };
    return renderPassDescriptor;
  }
  override onDecoratePipeline = (
    renderpipeline: RenderPipelineProps,
    renderPipelineDescriptor: RenderPipelineBuilderDesc,
  ) => {
    renderPipelineDescriptor.depthStencil = {
      depthCompare: renderpipeline.depthBuffer?.depthCompare ?? 'greater',
      depthWriteEnabled: renderpipeline.depthBuffer?.depthWriteEnabled ?? true,
      format: this.depthRenderTarget.props.format,
    };
  };
}
