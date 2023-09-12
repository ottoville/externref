import type { TerraCamera } from '../../TerraCamera.js';
import type { Drawable } from '../Drawables/Drawable.js';
import {
  RenderBundleEncoder,
  type ColorRenderTarget,
  type RenderPipeline,
  type RenderPipelineBuilder,
  Buffer,
  BufferUsageEnums,
  BindGroup,
  RenderPipelineLayout,
  RenderPipelineBuilderDesc,
} from '../../webgpu-ts/index.js';
import type { Engine } from '../../engine.js';
import type { GPU } from '../../GPU.js';
import { LegacyRenderPipeline } from 'GPU/RenderPipeline.js';
declare const engine: Engine;

const gpu_screen_buffer_size = 16; //screen width and height and ratio

// eslint-disable-next-line import/no-unused-modules
export class RenderPipelineVariant {
  constructor(
    public renderpipeline: RenderPipeline,
    public rootDrawables: Set<Drawable>,
  ) {}
  onRootDrawableChanges: Set<() => void> = new Set();
  addRootDrawable(drawable: Drawable) {
    this.rootDrawables.add(drawable);
    this.onRootDrawableChanges.forEach((cb) => cb());
    return this.rootDrawables;
  }
}

export type RenderPassProps<U> = {
  gpu: GPUDevice;
  colorRenderTargets: U;
  sampleCount: 1 | 4;
  size: { width: number; height: number };
  getSizeOnResize: (width: number, height: number) => [number, number];
  entryPoint: string;
  rootLayouts: RenderPipelineLayout[];
  label: string;
  GPURenderBundleEncoderDescriptor?: Partial<GPURenderBundleEncoderDescriptor>;
};

export class RenderPass<
  U extends {
    [index: string]: ColorRenderTarget;
  } = {
    [index: string]: ColorRenderTarget;
  },
> {
  readonly perspectiveCameras: Set<TerraCamera> = new Set();
  readonly #rootLayouts: RenderPipelineLayout[];

  readonly bundles: RenderBundleEncoder[] = [];
  readonly renderPipelines: Map<
    Readonly<RenderPipelineBuilder>,
    RenderPipelineVariant | Promise<RenderPipelineVariant>
  > = new Map();
  readonly createSizeBindGroup: () => BindGroup;
  #screenDimensionsBuffer: Buffer<BufferUsageEnums.UNIFORM>;
  readonly colorRenderTargets = {} as U;
  onResize: Map<object, () => void> = new Map();
  public sampleCount: 1 | 4;
  public size: { width: number; height: number };
  entryPoint: string;
  #getSizeOnResize: (width: number, height: number) => [number, number];
  public label: string;
  sizeBindGroup: BindGroup;
  onDecoratePipeline?: (
    renderpipeline: Readonly<LegacyRenderPipeline>,
    renderPipelineDescriptor: RenderPipelineBuilderDesc,
  ) => void;
  constructor(
    public props: RenderPassProps<U>,
    gpu: GPU,
  ) {
    const {
      colorRenderTargets,
      sampleCount,
      size,
      getSizeOnResize,
      entryPoint,
      rootLayouts: rootLayout,
      label,
      GPURenderBundleEncoderDescriptor,
    } = props;
    this.sampleCount = sampleCount;
    this.size = size;
    this.#getSizeOnResize = getSizeOnResize;
    this.entryPoint = entryPoint;
    this.#rootLayouts = rootLayout;
    this.label = label;
    this.colorRenderTargets = colorRenderTargets;
    const renderTargersArray = Object.values(colorRenderTargets);
    renderTargersArray.forEach((rt) => {
      rt.resize(this.size, this.sampleCount);
    });
    const renderBundle = new RenderBundleEncoder(
      this,
      GPURenderBundleEncoderDescriptor,
      (renderBundleEncoder) => {
        Object.values(this.colorRenderTargets).some((rt) => {
          if (rt.texture.sampleCount === 0 && rt.view.bindGroups.size === 0) {
            console.warn(
              'Rendertarget ',
              rt.props.label,
              ' is not binded as texture, render result will not be shown.',
            );
          }
        });

        let drawedMeshes = 0;
        if (this.perspectiveCameras.size === 0) {
          // Draw UI
          this.#rootLayouts.forEach((layout) => {
            drawedMeshes += this.renderLayout(renderBundleEncoder, layout, 0);
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
              drawedMeshes += this.renderLayout(renderBundleEncoder, layout, 2);
            });
          });
        }
      },
    );
    this.bundles.push(renderBundle);
    this.#screenDimensionsBuffer = this.#updateSizeBindGroup(gpu, true);
    this.createSizeBindGroup = () => {
      this.sizeBindGroup = new BindGroup(
        gpu.sizeBindGroupLayout,
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
    this.#screenDimensionsBuffer = new Buffer(
      {
        gpu: this.props.gpu,
        label: 'screen_buffer',
        size: gpu_screen_buffer_size,
        usages: BufferUsageEnums.UNIFORM,
      },
      (b) => {
        const uniformbuffer = b.getMappedRange();
        new Float32Array(uniformbuffer, 0, 4).set([
          this.size.width,
          this.size.height,
          this.size.width / gpu.clustersInRow[0],
          this.size.height / gpu.clustersInRow[1],
        ]);
      },
    );

    return this.#screenDimensionsBuffer;
  }
  onRenderPipelinesChange: Set<() => void> = new Set();

  resize(width: number, height: number) {
    if (width === 0) {
      throw new Error('Cannot resize renderpass to zero width');
    }
    [this.size.width, this.size.height] = this.#getSizeOnResize(width, height);
    this.#updateSizeBindGroup(engine.gpu!);
    for (const rt of Object.values(this.colorRenderTargets)) {
      rt.resize(this.size, this.sampleCount);
    }
  }
  //TODO: dont execute this function on every render
  get GPURenderPassDescriptor(): GPURenderPassDescriptor {
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: Object.values(this.colorRenderTargets).map((rt) =>
        rt.createColorAttachment(),
      ),
    };
    return renderPassDescriptor;
  }
  renderLayout(
    renderBundleEncoder: RenderBundleEncoder,
    layout: RenderPipelineLayout,
    bindGroupStartIndex: number,
  ): number {
    let meshesDrawn = 0;
    layout.sharedBindgroups.forEach((sharedBindgroup) => {
      renderBundleEncoder.renderBundleEncoder.setBindGroup(
        bindGroupStartIndex++,
        sharedBindgroup.bindGroup.getForRenderBundle(renderBundleEncoder),
        sharedBindgroup.offsets,
      );
    });
    layout.renderPipeLines.forEach((renderPipeline) => {
      const variant = this.renderPipelines.get(renderPipeline);
      if (variant && 'renderpipeline' in variant) {
        var drawables = variant.rootDrawables;
        if (!drawables || drawables.size == 0) {
          console.warn(
            'No drawables has been set for renderpass',
            this.props.label,
            ', wont draw anything',
          );
          return;
        }
        renderBundleEncoder.renderBundleEncoder.setPipeline(
          variant.renderpipeline.pipeline,
        );
        drawables.forEach((drawable) => {
          drawable.bindGroups.forEach((bindGroup, i) => {
            renderBundleEncoder.renderBundleEncoder.setBindGroup(
              i + bindGroupStartIndex,
              bindGroup.bindGroup.getForRenderBundle(renderBundleEncoder),
              bindGroup.offsets,
            );
          });
          drawable.vertexBuffers.forEach((buffer, index) =>
            renderBundleEncoder.renderBundleEncoder.setVertexBuffer(
              index,
              buffer.buffer.getVertexBinding(renderBundleEncoder),
              buffer.offset,
              buffer.size,
            ),
          );
          drawable.render(renderBundleEncoder);
          meshesDrawn++;
        });
      }
    });
    layout.subBindGroups.forEach((subBindGroup) => {
      meshesDrawn += this.renderLayout(
        renderBundleEncoder,
        subBindGroup,
        bindGroupStartIndex,
      );
    });
    return meshesDrawn;
  }

  render(renderEncoder: GPUCommandEncoder) {
    const passEncoder = renderEncoder.beginRenderPass(
      this.GPURenderPassDescriptor,
    );
    passEncoder.executeBundles(
      this.bundles.map((b) => {
        return b.renderBundle();
      }),
    );
    passEncoder.end();
  }
}
