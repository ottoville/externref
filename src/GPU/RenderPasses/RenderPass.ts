import type { TerraCamera } from '../../TerraCamera.js';
import {
  type ColorRenderTarget,
  RenderPipelineLayout,
  RenderPipelineBuilderDesc,
  Renderpass,
  type RenderpassProps,
} from '../../webgpu-ts/index.js';
import type { Engine } from '../../engine.js';
import type { RenderPipelineProps } from 'GPU/RenderPipeline.js';
import { create_rust_label } from '../../utils.js';
import { Externref } from 'externref.js';
declare const engine: Engine;

export interface RenderPassProps<
  U extends {
    [index: string]: ColorRenderTarget;
  },
  E extends string = string,
> extends RenderpassProps<U> {
  size: { width: number; height: number };
  getSizeOnResize: (width: number, height: number) => [number, number];
  entryPoint: E;
  rootLayout: RenderPipelineLayout;
  GPURenderBundleEncoderDescriptor?: Partial<GPURenderBundleEncoderDescriptor>;
  id: number;
}

export class RenderPass<
  U extends {
    [index: string]: ColorRenderTarget;
  } = {
    [index: string]: ColorRenderTarget;
  },
  E extends string = string,
> extends Renderpass<U> {
  readonly perspectiveCameras: TerraCamera[] = [];
  readonly #rootLayout: RenderPipelineLayout;

  onResize: Map<object, () => void> = new Map();
  public size: { width: number; height: number };
  entryPoint: E;
  #getSizeOnResize: (width: number, height: number) => [number, number];
  onDecoratePipeline?: (
    renderpipeline: RenderPipelineProps,
    renderPipelineDescriptor: RenderPipelineBuilderDesc,
  ) => void;
  override props: Readonly<RenderPassProps<U, E>>;
  constructor(props: RenderPassProps<U, E>) {
    super(props);
    this.props = Object.freeze(props);
    const {
      id,
      colorRenderTargets,
      size,
      getSizeOnResize,
      entryPoint,
      rootLayout,
      GPURenderBundleEncoderDescriptor,
    } = props;
    this.size = size;
    this.#getSizeOnResize = getSizeOnResize;
    this.entryPoint = entryPoint;
    this.#rootLayout = rootLayout;
    const renderTargersArray = Object.values(colorRenderTargets);
    renderTargersArray.forEach((rt) => {
      rt.resize(this.size, this.props.sampleCount);
    });
    const GPURenderBundleEncoderDescriptor2 = {
      colorFormats: Object.values(this.props.colorRenderTargets).map((rt) => {
        return rt.renderTargetOptions.context.format;
      }),
      sampleCount: this.props.sampleCount ?? 1,
      ...GPURenderBundleEncoderDescriptor,
    };

    const recorder = (
      renderBundleEncoder2: GPURenderBundleEncoder,
      gpu_buffer: number,
      bind_group_position: rust_pointer<'bind_group_position'>,
      bindgroup_start_index: number,
    ) => {
      engine.gpu!.gpu_buffer = gpu_buffer;
      engine.gpu!.bind_group_position = bind_group_position;
      renderBundle2.renderBundleEncoder = renderBundleEncoder2;
      this.#rootLayout.render(renderBundle2, this, bindgroup_start_index);
    };
    const rust_renderbundle = engine.rust.link_renderpass(
      id,
      this,
      GPURenderBundleEncoderDescriptor2,
      ...create_rust_label(this.props.label),
      recorder,
    );

    const renderBundle2 = {
      destroy: () => {
        engine.rust.renderbundle_make_dirty(rust_renderbundle);
      },
      rust_renderbundle_encoder: rust_renderbundle,
    } as unknown as {
      destroy: () => void;
      render: () => GPURenderBundle;
      renderBundleEncoder: GPURenderBundleEncoder;
    };
    this.bundles.push(renderBundle2);
  }
  onRenderPipelinesChange: Set<() => void> = new Set();

  resize(
    width: number,
    height: number,
    computepass: rust_pointer<'computepass'>,
    cameragroups: rust_pointer<'cameragroups'>,
    cameras: rust_pointer<'cameras'>,
    device: Externref<false, GPUDevice>,
  ) {
    if (width === 0) {
      throw new Error('Cannot resize renderpass to zero width');
    }
    [this.size.width, this.size.height] = this.#getSizeOnResize(width, height);
    engine.rust.resize_renderpass(
      this.size.width,
      this.size.height,
      computepass,
      cameragroups,
      cameras,
      device,
    );
    for (const rt of Object.values(this.props.colorRenderTargets)) {
      rt.resize(this.size, this.props.sampleCount);
    }
  }
}
