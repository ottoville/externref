import type { TerraCamera } from '../../TerraCamera.js';
import {
  type ColorRenderTarget,
  Buffer,
  BufferUsageEnums,
  BindGroup,
  RenderPipelineLayout,
  RenderPipelineBuilderDesc,
  Renderpass,
  type RenderpassProps,
} from '../../webgpu-ts/index.js';
import type { Engine } from '../../engine.js';
import type { GPU } from '../../GPU.js';
import { tileCount } from '../Shaders/structs/Structs.js';
import type { RenderPipelineProps } from 'GPU/RenderPipeline.js';
import { create_rust_label } from '../../utils.js';
declare const engine: Engine;

const gpu_screen_buffer_size = 16; //screen width and height and ratio

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

  #screenDimensionsBuffer: Buffer<BufferUsageEnums.UNIFORM>;
  onResize: Map<object, () => void> = new Map();
  public size: { width: number; height: number };
  entryPoint: E;
  #getSizeOnResize: (width: number, height: number) => [number, number];
  sizeBindGroup: BindGroup;
  onDecoratePipeline?: (
    renderpipeline: RenderPipelineProps,
    renderPipelineDescriptor: RenderPipelineBuilderDesc,
  ) => void;
  constructor(props: RenderPassProps<U, E>, gpu: GPU) {
    super(props);
    const {
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

    const rust_renderbundle = engine.rust.new_renderbundle(
      GPURenderBundleEncoderDescriptor2,
      ...create_rust_label(this.props.label),
    );
    const recorder = (renderBundleEncoder2: GPURenderBundleEncoder) => {
      renderBundle2.renderBundleEncoder = renderBundleEncoder2;
      let drawedMeshes = 0;
      if (this.perspectiveCameras.length === 0) {
        // Draw UI
        drawedMeshes += this.#rootLayout.render(renderBundle2, this, 0);
      } else {
        renderBundleEncoder2.setBindGroup(
          0,
          this.sizeBindGroup.getForRenderBundle(renderBundle2),
        );

        this.perspectiveCameras.forEach((camera) => {
          engine.rust.renderbundle_set_bindgroup(
            rust_renderbundle,
            1,
            gpu.gpu_lock!,
            camera.id,
          );
          drawedMeshes += this.#rootLayout.render(renderBundle2, this, 2);
        });
      }
    };
    const renderBundle2 = {
      destroy: () => {
        engine.rust.renderbundle_make_dirty(rust_renderbundle);
      },
      render: () => {
        const index = engine.rust.record_renderbundle(
          rust_renderbundle,
          engine.gpu!.gpu_lock!,
          recorder,
        );
        const rb = engine.rust.externrefs.get(index) as GPURenderBundle;
        return rb;
      },
    } as {
      destroy: () => void;
      render: () => GPURenderBundle;
      renderBundleEncoder: GPURenderBundleEncoder;
    };
    this.bundles.push(renderBundle2);

    this.#screenDimensionsBuffer = this.#updateSizeBindGroup(gpu, true);

    this.sizeBindGroup = new BindGroup(
      gpu.pipelineLayouts.sizeBindGroupLayout,
      'sizeBindGroup',
      (bindGroup) => ({
        screen_dimensions: this.#screenDimensionsBuffer.getUniformBinding(
          bindGroup,
          0,
          16,
        ),
      }),
    );
  }
  #updateSizeBindGroup(gpu: GPU, initial = false) {
    if (!initial) this.#screenDimensionsBuffer.destroy();
    const screenDimensionsBuffer = new Buffer({
      gpu: gpu.device,
      label: 'screen_buffer',
      mappedAtCreation: true,
      size: gpu_screen_buffer_size,
      usages: BufferUsageEnums.UNIFORM,
    });
    const uniformbuffer = screenDimensionsBuffer.getMappedRange();
    new Float32Array(uniformbuffer, 0, 4).set([
      this.size.width,
      this.size.height,
      this.size.width / tileCount[0],
      this.size.height / tileCount[1],
    ]);

    this.#screenDimensionsBuffer = screenDimensionsBuffer.unmap();
    return this.#screenDimensionsBuffer;
  }
  onRenderPipelinesChange: Set<() => void> = new Set();

  resize(width: number, height: number) {
    if (width === 0) {
      throw new Error('Cannot resize renderpass to zero width');
    }
    [this.size.width, this.size.height] = this.#getSizeOnResize(width, height);
    this.#updateSizeBindGroup(engine.gpu!);
    for (const rt of Object.values(this.props.colorRenderTargets)) {
      rt.resize(this.size, this.props.sampleCount);
    }
  }
}
