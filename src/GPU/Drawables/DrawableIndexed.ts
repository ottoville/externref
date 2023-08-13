import { Buffer, type IndexBuffer, GPUBufferUsage } from '../Buffer/Buffer.js';
import type { Engine } from '../../engine.js';
import {
  DrawableDirect,
  DrawableDirectProps,
  type MappedVertexBuffers,
} from './DrawableDirect.js';
import type { RenderPipeline } from '../RenderPipeline.js';
import type { DrawableProps } from './Drawable.js';
import type { RenderPass } from '../RenderPasses/RenderPass.js';
import type { DataNode } from '../../nodes/DataNode.js';
import { VertexShader } from '../Shaders/VertexShader.js';
import {
  BGLayout,
  SampLayout,
  ShaderStage,
  TextLayout,
} from '../BindGroupLayout.js';
import { TextureView } from '../TextureView.js';
import { TEXTURE_BINDING_TEXTURE, Texture } from '../Texture.js';
import { FragmentShader } from '../Shaders/FragmentShader.js';
import { RenderPipelineLayout } from '../PipelineLayout.js';
import { BindGroup } from '../BindGroup.js';
declare const engine: Engine;

type DrawableIndexedProps = {
  baseVertex?: number;
  firstIndex?: number;
  GPUIndexFormat?: GPUIndexFormat;
};

export class DrawableIndexed<
  R extends RenderPipeline = RenderPipeline,
  N extends DataNode = DataNode,
> extends DrawableDirect<N> {
  #indexBuffer: IndexBuffer | undefined;
  #baseVertex: number;
  #firstIndex: number;
  #GPUIndexFormat: GPUIndexFormat;
  /**
   * Override indices_count. When not set, defaults to index buffer size
   */
  indices_count?: number;
  constructor(
    drawableProps: Omit<DrawableProps<N>, 'label'> & {
      renderPipeline: R;
      vertexBuffers: MappedVertexBuffers<R>;
    },
    drawableDirectProps?: DrawableDirectProps,
    {
      baseVertex = 0,
      firstIndex = 0,
      GPUIndexFormat = 'uint32',
    }: DrawableIndexedProps = {},
  ) {
    super(
      {
        ...drawableProps,
        dynamicBindGroups: [
          [
            drawableProps.renderPipeline.props.bindgroupdrawable.bindGroupLayout
              .gpu.BindGroupPosition,
            engine.rust.gpu_alignment(drawableProps.node.id),
          ],
        ],
      },
      drawableDirectProps,
    );
    const indices = this.node.indices;
    if (indices.length > 0) this.setIndexBuffer(indices);
    this.#baseVertex = baseVertex;
    this.#firstIndex = firstIndex;
    this.#GPUIndexFormat = GPUIndexFormat;
  }

  override destroy(
    preserveVerticeBuffers: number[] = [],
    preserveIndexBuffer = false,
  ): void {
    super.destroy(preserveVerticeBuffers);
    if (!preserveIndexBuffer && this.#indexBuffer) {
      this.#indexBuffer.destroy();
    }
  }

  setIndexBuffer(
    buffer: IndexBuffer,
    baseVertex?: number,
    destroyOld?: boolean,
    GPUIndexFormat?: GPUIndexFormat,
  ): IndexBuffer;
  setIndexBuffer(
    buffer: Uint16Array | Uint32Array,
    baseVertex?: number,
    destroyOld?: boolean,
  ): IndexBuffer;
  setIndexBuffer(
    buffer: Uint16Array | Uint32Array | IndexBuffer,
    baseVertex = 0,
    destroyOld = true,
    GPUIndexFormat?: GPUIndexFormat,
  ): IndexBuffer {
    this.#baseVertex = baseVertex;
    if (destroyOld && this.#indexBuffer) {
      this.#indexBuffer.destroy();
    }
    if (buffer instanceof Buffer) {
      this.#indexBuffer = buffer;
      if (GPUIndexFormat) {
        this.#GPUIndexFormat = GPUIndexFormat;
      }
    } else {
      this.#indexBuffer = Buffer.create(
        this.renderPipeline.props.bindgroupdrawable.bindGroupLayout.gpu,
        buffer.byteLength,
        [GPUBufferUsage.INDEX],
        'index_' + this.node.label,
        (b) => {
          if (buffer.BYTES_PER_ELEMENT == 4) {
            new Uint32Array(b.getMappedRange()).set(buffer);
            this.#GPUIndexFormat = 'uint32';
          } else {
            new Uint16Array(b.getMappedRange()).set(buffer);
            this.#GPUIndexFormat = 'uint16';
          }
        },
      );
    }
    return this.#indexBuffer;
  }
  render(
    renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder,
    renderPass: RenderPass,
  ) {
    if (this.#indexBuffer) {
      renderEncoder.setIndexBuffer(
        this.#indexBuffer.getIndexBuffer(renderPass),
        this.#GPUIndexFormat,
      );
      const indices_count = this.indices_count ?? this.node.indices_count;
      if (indices_count === 0) {
        console.warn('wont draw', this.node.label, ', zero indices');
      } else {
        console.debug(
          'drawIndexed',
          this.node.label,
          'indices',
          indices_count,
          'instanceCount',
          this.instanceCount,
          'indexFormat',
          this.#GPUIndexFormat,
        );
        renderEncoder.drawIndexed(
          indices_count,
          this.instanceCount,
          this.#firstIndex,
          this.#baseVertex,
          this.firstInstance,
        );
      }
    } else {
      console.warn('wont draw', this.node.label, ', no indexBuffer');
    }
  }
}

/**
 * Drawable that is used with lightsTextureBindGroup
 */
export class LightsTextureDrawableIndexed<
  R extends RenderPipeline<
    VertexShader,
    FragmentShader,
    RenderPipelineLayout<
      readonly [
        BGLayout,
        BGLayout,
        BGLayout,
        BGLayout<{
          mySampler: SampLayout<ShaderStage.FRAGMENT, 'sampler'>;
          diffuseTexture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
        }>,
      ]
    >
  >,
  N extends DataNode = DataNode,
> extends DrawableIndexed<R, N> {
  override staticBindGroup: BindGroup<
    BGLayout<{
      mySampler: SampLayout<ShaderStage.FRAGMENT, 'sampler'>;
      diffuseTexture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
    }>
  >;
  constructor(
    private drawableProps: Omit<DrawableProps<N>, 'label'> & {
      renderPipeline: R;
      vertexBuffers: MappedVertexBuffers<R>;
    },
    private texture: TextureView<
      Texture<GPUTextureFormat, TEXTURE_BINDING_TEXTURE>
    >,
    private sampler: GPUSampler,
    drawableDirectProps?: DrawableDirectProps,
    drawableIndexedProps: DrawableIndexedProps = {},
  ) {
    super(drawableProps, drawableDirectProps, drawableIndexedProps);

    this.staticBindGroup = new BindGroup(
      this.drawableProps.renderPipeline.props.bindgroupdrawable.bindGroupLayouts[3],
      'LightsTextureDrawableIndexed_static',
      () => {
        return {
          diffuseTexture: this.texture,
          mySampler: this.sampler,
        };
      },
    );
  }
  setTexture(
    texture: TextureView<Texture<GPUTextureFormat, TEXTURE_BINDING_TEXTURE>>,
  ) {
    this.texture = texture;
    this.staticBindGroup?.destroy();
  }
}
