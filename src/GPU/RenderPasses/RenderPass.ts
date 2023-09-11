import type { TerraCamera } from '../../TerraCamera.js';
import type { Drawable } from '../Drawables/Drawable.js';
import { LegacyRenderPipelineLayout } from '../PipelineLayout.js';
import {
  RenderBundleEncoder,
  type ColorRenderTarget,
  type RenderPipeline,
  type RenderPipelineBuilder,
  Buffer2,
  BufferUsageEnums,
  BindGroup,
} from '../../webgpu-ts/index.js';
import { LegacyRenderPipeline } from 'GPU/RenderPipeline.js';
import type { Engine } from '../../engine.js';
import type { GPU } from '../../GPU.js';
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
  rootLayouts: LegacyRenderPipelineLayout[];
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
  readonly #rootLayouts: LegacyRenderPipelineLayout[];

  readonly bundles: RenderBundleEncoder[] = [];
  readonly renderPipelines: Map<
    Readonly<RenderPipelineBuilder>,
    RenderPipelineVariant | Promise<RenderPipelineVariant>
  > = new Map();
  readonly createSizeBindGroup: () => BindGroup;
  #screenDimensionsBuffer: Buffer2<BufferUsageEnums.UNIFORM>;
  readonly colorRenderTargets = {} as U;
  onResize: Map<object, () => void> = new Map();
  public sampleCount: 1 | 4;
  public size: { width: number; height: number };
  entryPoint: string;
  #getSizeOnResize: (width: number, height: number) => [number, number];
  public label: string;
  sizeBindGroup: BindGroup;
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

        //@ts-ignore
        let drawedMeshes = 0;
        if (this.perspectiveCameras.size === 0) {
          // Draw UI
          drawedMeshes += this.#renderCamera(
            renderBundleEncoder,
            // this.#rootLayouts,
            0,
          );
        } else {
          renderBundleEncoder.renderBundleEncoder.setBindGroup(
            0,
            this.createSizeBindGroup().getForRenderBundle(renderBundleEncoder),
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
              // this.#rootLayouts,
              2,
            );
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
    this.#screenDimensionsBuffer = new Buffer2(
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

  public onDecoratePipeline(
    renderpipeline: Readonly<LegacyRenderPipeline>,
  ): Omit<GPURenderPipelineDescriptor, 'layout'> {
    const fragmentEntry = renderpipeline.props.connections[this.entryPoint];
    if (!fragmentEntry) {
      throw new Error(
        'Fragmentshader has no corresponding entry for output ' +
          this.entryPoint,
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
          renderpipeline.props.vertexShader.props.entryPoints[this.entryPoint]!
            .buffers,
        entryPoint: this.entryPoint,
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

  #renderCamera(
    renderBundleEncoder: RenderBundleEncoder,
    //  rootLayout: LegacyRenderPipelineLayout[],
    bindGroupStartIndex: number,
  ) {
    /*this.renderPipelines.forEach((renderPipeline) => {
      if (!(renderPipeline instanceof Promise)) {
        renderPipeline.renderpipeline.draw(
          renderBundleEncoder,
          bindGroupStartIndex,
        );
      }
    });*/

    let drawedMeshes = 0;
    this.#rootLayouts.forEach((layout) => {
      //@ts-expect-error
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
            return 0;
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
          });
          //variant.renderpipeline.draw(renderBundleEncoder, bindGroupStartIndex);
        } /*
        drawedMeshes += renderPipeline.draw(
          renderBundleEncoder,
          this,
          bindGroupStartIndex,
        );*/
      });
      layout.subBindGroups.forEach((subBindGroup) => {
        //@ts-expect-error
        subBindGroup.renderPipeLines.forEach((renderPipeline) => {
          const variant = this.renderPipelines.get(renderPipeline);
          if (variant && 'renderpipeline' in variant) {
            var drawables = variant.rootDrawables;
            if (!drawables || drawables.size == 0) {
              console.warn(
                'No drawables has been set for renderpass',
                this.props.label,
                ', wont draw anything',
              );
              return 0;
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
            });
          }
        });
      });
      return 0;
      const dynamicIndices: number[] = [];
      layout.subBindGroups.forEach((subBindGroup) => {
        //POSITION
        if (subBindGroup.bindGroupLayout.dynamicIndices) {
          dynamicIndices.push(bindGroupStartIndex);
        }
        subBindGroup.renderPipeLines.forEach((renderPipeline) => {
          //@ts-expect-error
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
            //@ts-expect-error
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
    return 0;
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
