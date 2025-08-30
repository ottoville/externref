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
import type { GPU } from '../../GPU.js';
declare const engine: Engine;

export interface RenderPassProps<
  U extends {
    [index: string]: ColorRenderTarget;
  },
  E extends string = string,
> extends RenderpassProps<U> {
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

  onResize: Map<object, (width: number, height: number) => void> = new Map();
  public get size() {
    const ptr = engine.rust.get_renderpass_size(this.props.id);
    const size = [...new Uint32Array(engine.rust.memory.buffer, ptr, 2)] as [
      number,
      number,
    ];
    return {
      height: size[1],
      width: size[0],
    };
  }
  entryPoint: E;
  onDecoratePipeline?: (
    renderpipeline: RenderPipelineProps,
    renderPipelineDescriptor: RenderPipelineBuilderDesc,
  ) => void;
  override props: Readonly<RenderPassProps<U, E>>;
  constructor(props: RenderPassProps<U, E>) {
    super(props);
    this.props = Object.freeze(props);
    const { entryPoint, rootLayout } = props;
    this.entryPoint = entryPoint;
    this.#rootLayout = rootLayout;
  }
  onRenderPipelinesChange: Set<() => void> = new Set();
  link_renderpass(gpu: GPU) {
    const { id, GPURenderBundleEncoderDescriptor } = this.props;

    const rust_renderbundle = engine.rust.link_renderpass(
      id,
      {
        colorFormats: Object.values(this.props.colorRenderTargets).map((rt) => {
          return rt.renderTargetOptions.context.format;
        }),
        ...GPURenderBundleEncoderDescriptor,
      },
      (
        renderBundleEncoder2,
        gpu_buffer,
        bind_group_position,
        bindgroup_start_index,
      ) => {
        gpu.gpu_buffer = gpu_buffer;
        gpu.bind_group_position = bind_group_position;
        this.#rootLayout.render(
          {
            destroy: () => {
              engine.rust.renderbundle_make_dirty(rust_renderbundle);
            },
            renderBundleEncoder: renderBundleEncoder2,
            //@ts-expect-error rust fix
            rust_renderbundle_encoder: rust_renderbundle,
          },
          this,
          bindgroup_start_index,
        );
        //@ts-expect-error rust fix
        this.bundles.push({
          destroy: () => {
            engine.rust.renderbundle_make_dirty(rust_renderbundle);
          },
        });
      },
      false,
      false,
    );
  }
  resize(width: number, height: number) {
    for (const rt of Object.values(this.props.colorRenderTargets)) {
      rt.resize({ height, width }, this.props.sampleCount);
    }
  }
}
