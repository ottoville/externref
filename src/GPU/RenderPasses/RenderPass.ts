import type { TerraCamera } from '../../TerraCamera.js';
import { type GPU } from '../../GPU.js';
import type { Drawable } from '../Drawables/Drawable.js';
import type { ColorRenderTarget } from '../RenderTargets/ColorRenderTarget.js';
import {
  type BindUniformBuffer,
  Buffer,
  GPUBufferUsage,
} from '../Buffer/Buffer.js';
import { BindGroup } from '../BindGroup.js';
import { RenderBundleEncoder } from '../RenderBundleEncoder.js';
import { RenderPipelineLayout } from '../PipelineLayout.js';
import type { RenderPipeline } from '../RenderPipeline.js';
import type {
  RENDER_TARGET_FORMAT,
  RENDER_TARGET_TEXTURE,
} from '../../webgpu-ts/Texture.js';

// eslint-disable-next-line import/no-unused-modules
export class RenderPipelineVariant {
  constructor(
    public renderpipeline: GPURenderPipeline,
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
  gpu: GPU;
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
    [index: string]: ColorRenderTarget<
      RENDER_TARGET_FORMAT,
      RENDER_TARGET_TEXTURE
    >;
  } = {
    [index: string]: ColorRenderTarget<
      RENDER_TARGET_FORMAT,
      RENDER_TARGET_TEXTURE
    >;
  },
> {
  readonly perspectiveCameras: Set<TerraCamera> = new Set();
  readonly #rootLayouts: RenderPipelineLayout[];

  readonly bundles: RenderBundleEncoder[] = [];
  readonly renderPipelines: Map<
    Readonly<RenderPipeline>,
    RenderPipelineVariant | Promise<RenderPipelineVariant>
  > = new Map();
  readonly sizeBindGroup: () => BindGroup;
  #screenDimensionsBuffer: BindUniformBuffer;
  readonly colorRenderTargets = {} as U;
  onResize: Map<object, () => void> = new Map();
  public gpu: GPU;
  public sampleCount: 1 | 4;
  public size: { width: number; height: number };
  #entryPoint: string;
  #getSizeOnResize: (width: number, height: number) => [number, number];
  public label: string;
  constructor({
    gpu,
    colorRenderTargets,
    sampleCount,
    size,
    getSizeOnResize,
    entryPoint,
    rootLayouts: rootLayout,
    label,
    GPURenderBundleEncoderDescriptor,
  }: RenderPassProps<U>) {
    this.gpu = gpu;
    this.sampleCount = sampleCount;
    this.size = size;
    this.#getSizeOnResize = getSizeOnResize;
    this.#entryPoint = entryPoint;
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
        //@ts-ignore
        let drawedMeshes = 0;
        if (this.perspectiveCameras.size === 0) {
          // Draw UI
          drawedMeshes += this.#renderCamera(
            renderBundleEncoder,
            this.#rootLayouts,
            0,
          );
        } else {
          renderBundleEncoder.renderBundleEncoder.setBindGroup(
            0,
            this.sizeBindGroup().getForRenderBundle(renderBundleEncoder),
          );
          this.perspectiveCameras.forEach((camera) => {
            // TODO: camera.uniformBindGroup holds gpu.GPUMeshes on binding 3 which
            // is not used in rendering shaders, but it is binded later with dynamic indices.
            // Concider refactoring it out of this
            renderBundleEncoder.renderBundleEncoder.setBindGroup(
              1,
              camera.uniformBindGroup!.getForRenderBundle(renderBundleEncoder),
            );
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            drawedMeshes += this.#renderCamera(
              renderBundleEncoder,
              this.#rootLayouts,
              2,
            );
          });
        }
      },
    );
    this.bundles.push(renderBundle);
    this.#screenDimensionsBuffer = this.#updateSizeBindGroup(true);
    this.sizeBindGroup = () =>
      new BindGroup(gpu.sizeBindGroupLayout, 'sizeBindGroup', (bindGroup) => ({
        screen_dimensions: this.#screenDimensionsBuffer.getUniformBinding(
          bindGroup,
          0,
          16,
        ),
      }));
  }
  #updateSizeBindGroup(initial = false) {
    if (!initial) this.#screenDimensionsBuffer.destroy();
    this.#screenDimensionsBuffer = Buffer.create(
      this.gpu,
      this.gpu.gpu_screen_buffer_size,
      [GPUBufferUsage.UNIFORM],
      'screen_buffer',
      (b) => {
        const uniformbuffer = b.getMappedRange();
        new Float32Array(uniformbuffer, 0, 4).set([
          this.size.width,
          this.size.height,
          this.size.width / this.gpu.clustersInRow[0],
          this.size.height / this.gpu.clustersInRow[1],
        ]);
      },
    );

    return this.#screenDimensionsBuffer;
  }
  onRenderPipelinesChange: Set<() => void> = new Set();
  getVariant(renderPipeline: Readonly<RenderPipeline>) {
    let variant = this.renderPipelines.get(renderPipeline);
    if (!variant) {
      // Use layout from vertex shader for pipeline layout.
      const layout =
        renderPipeline.props.vertexShader.props.entryPoints[this.#entryPoint]!
          .pipelineLayout.layout;
      const params = {
        ...renderPipeline.props.descriptor,
        layout,
        ...this.onDecoratePipeline(renderPipeline),
        label:
          'renderPipeline:' +
          renderPipeline.props.label +
          ' RenderPass:' +
          this.label,
      };
      console.debug(
        'Create renderpipeline ',
        renderPipeline.props.label,
        params,
      );
      const variantP = this.gpu.device
        .createRenderPipelineAsync(params)
        .catch((err: unknown) => {
          if (err instanceof DOMException) {
            if (
              err.message.includes(
                renderPipeline.props.vertexShader.module.label,
              )
            ) {
              console.error(
                'createRenderPipelineAsync failed, vertex',
                renderPipeline.props.vertexShader.module.label,
                'wgsl:',
                renderPipeline.props.vertexShader.wgsl,
                {
                  cause: err,
                },
              );
            } else if (
              err.message.includes(
                renderPipeline.props.fragmentShader.module.label,
              )
            ) {
              console.error(
                'createRenderPipelineAsync failed, fragment',
                renderPipeline.props.fragmentShader.module.label,
                'wgsl:',
                renderPipeline.props.fragmentShader.wgsl,
                {
                  cause: err,
                },
              );
            } else {
              console.error(
                'createRenderPipelineAsync failed, vertex',
                renderPipeline.props.vertexShader.module.label,
                ' wgsl:',
                renderPipeline.props.vertexShader.wgsl,
                'fragment',
                renderPipeline.props.fragmentShader.module,
                ' wgsl:',
                renderPipeline.props.fragmentShader.wgsl,
                {
                  cause: err,
                },
              );
            }
          }
          throw new Error('createRenderPipelineAsync failed', {
            cause: err,
          });
        })
        .then((variantPipeline) => {
          variant = new RenderPipelineVariant(
            variantPipeline,
            new Set<Drawable>(),
          );
          // Replace promise with real object
          this.renderPipelines.set(renderPipeline, variant);
          this.onRenderPipelinesChange.forEach((cb) => cb());
          return variant;
        });
      // Save promise
      this.renderPipelines.set(renderPipeline, variantP);
      variant = variantP;
    }
    return variant;
  }

  protected onDecoratePipeline(
    renderpipeline: Readonly<RenderPipeline>,
  ): Omit<GPURenderPipelineDescriptor, 'layout'> {
    const fragmentEntry = renderpipeline.props.connections[this.#entryPoint];
    if (!fragmentEntry) {
      throw new Error(
        'Fragmentshader has no corresponding entry for output ' +
          this.#entryPoint,
      );
    }
    const renderPipelineDescriptor: Omit<
      GPURenderPipelineDescriptor,
      'layout'
    > = {
      fragment: {
        ...renderpipeline.props.fragmentShader,
        entryPoint: fragmentEntry,
        targets: Object.values(this.colorRenderTargets).map((rt) => {
          const state: GPUColorTargetState = {
            format: rt.texture.format,
            writeMask: rt.renderTargetOptions.writeMask,
          };
          if (rt.blend) {
            state.blend = rt.blend;
          }
          return state;
        }),
      },
      vertex: {
        buffers:
          renderpipeline.props.vertexShader.props.entryPoints[this.#entryPoint]!
            .buffers,
        entryPoint: this.#entryPoint,
        module: renderpipeline.props.vertexShader.module,
      },
    };
    if (this.sampleCount > 1)
      renderPipelineDescriptor.multisample = {
        count: this.sampleCount,
      };
    return renderPipelineDescriptor;
  }
  resize(width: number, height: number) {
    if (width === 0) {
      throw new Error('Cannot resize renderpass to zero width');
    }
    [this.size.width, this.size.height] = this.#getSizeOnResize(width, height);
    this.#updateSizeBindGroup();
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

  #renderCamera(
    renderBundleEncoder: RenderBundleEncoder,
    rootLayout: RenderPipelineLayout[],
    bindGroupStartIndex: number,
  ) {
    let drawedMeshes = 0;
    rootLayout.forEach((layout) => {
      layout.renderPipeLines.forEach((renderPipeline) => {
        drawedMeshes += renderPipeline.draw(
          renderBundleEncoder,
          this,
          bindGroupStartIndex,
        );
      });
      const dynamicIndices: number[] = [];
      layout.subBindGroups.forEach((subBindGroup) => {
        //POSITION
        if (subBindGroup.bindGroupLayout.dynamicIndices) {
          dynamicIndices.push(bindGroupStartIndex);
        }
        subBindGroup.renderPipeLines.forEach((renderPipeline) => {
          drawedMeshes += renderPipeline.draw(
            renderBundleEncoder,
            this,
            bindGroupStartIndex,
            dynamicIndices,
          );
        });
        subBindGroup.subBindGroups.forEach((pipelineLayout) => {
          if (pipelineLayout.sharedBindgroup) {
            renderBundleEncoder.renderBundleEncoder.setBindGroup(
              bindGroupStartIndex + 1,
              pipelineLayout.sharedBindgroup.getForRenderBundle(
                renderBundleEncoder,
              ),
            );
          }
          pipelineLayout.renderPipeLines.forEach((renderPipeline) => {
            drawedMeshes += renderPipeline.draw(
              renderBundleEncoder,
              this,
              bindGroupStartIndex + dynamicIndices.length,
              dynamicIndices,
            );
          });
        });
        dynamicIndices.length = 0;
      });
    });
    return drawedMeshes;
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
