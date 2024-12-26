import type { TerraCamera } from '../../TerraCamera.js';
import {
  RenderBundleEncoder,
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
import { type GPU } from '../../GPU.js';
import { tileCount } from '../Shaders/structs/Structs.js';
import type { RenderPipelineProps } from 'GPU/RenderPipeline.js';
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
  rootLayouts: RenderPipelineLayout[];
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
  readonly #rootLayouts: RenderPipelineLayout[];

  readonly createSizeBindGroup: () => BindGroup;
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
      rootLayouts: rootLayout,
      GPURenderBundleEncoderDescriptor,
    } = props;
    this.size = size;
    this.#getSizeOnResize = getSizeOnResize;
    this.entryPoint = entryPoint;
    this.#rootLayouts = rootLayout;
    const renderTargersArray = Object.values(colorRenderTargets);
    renderTargersArray.forEach((rt) => {
      rt.resize(this.size, this.props.sampleCount);
    });
    const renderBundle = new RenderBundleEncoder(
      this,
      gpu.device,
      GPURenderBundleEncoderDescriptor,
      (renderBundleEncoder) => {
        let drawedMeshes = 0;
        if (this.perspectiveCameras.length === 0) {
          // Draw UI
          this.#rootLayouts.forEach((layout) => {
            drawedMeshes += layout.render(renderBundleEncoder, this, 0);
          });
        } else {
          renderBundleEncoder.renderBundleEncoder.setBindGroup(
            0,
            this.createSizeBindGroup().getForRenderBundle(renderBundleEncoder),
          );

          this.perspectiveCameras.forEach((camera) => {
            renderBundleEncoder.renderBundleEncoder.setBindGroup(
              1,
              camera.uniformBindGroup!.getForRenderBundle(renderBundleEncoder),
            );
            this.#rootLayouts.forEach((layout) => {
              drawedMeshes += layout.render(renderBundleEncoder, this, 2);
            });
          });
        }
      },
    );
    this.bundles.push(renderBundle);
    this.#screenDimensionsBuffer = this.#updateSizeBindGroup(gpu, true);
    this.createSizeBindGroup = () => {
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
      return this.sizeBindGroup;
    };
    this.sizeBindGroup = this.createSizeBindGroup();
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
