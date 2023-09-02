import { BindGroup } from '../BindGroup.js';
import type {
  DrawableDirectProps,
  MappedVertexBuffers,
} from './DrawableDirect.js';
import type { TextureView } from '../TextureView.js';
import type {
  BGLayout,
  SampLayout,
  TextLayout,
} from '../../webgpu-ts/BindgroupLayout.js';
import type { RenderPipeline } from '../RenderPipeline.js';
import type { DataNode } from '../../nodes/DataNode.js';
import {
  DrawableIndexed,
  type DrawableIndexedProps,
} from './DrawableIndexed.js';
import type { DrawableProps } from './Drawable.js';
import type { FragmentShader } from '../Shaders/FragmentShader.js';
import type { VertexShader } from 'GPU/Shaders/VertexShader';
import type { RenderPipelineLayout } from 'GPU/PipelineLayout';
import type {
  TEXTURE_BINDING_TEXTURE,
  Texture,
} from '../../webgpu-ts/Texture.js';
import type { ShaderStage } from '../../webgpu-ts/Shader.js';

/**
 * Drawable that is used with lightsTextureBindGroup
 */
export class LightsTextureDrawableIndexed<
  R extends RenderPipeline<VertexShader, FragmentShader>,
  N extends DataNode = DataNode,
> extends DrawableIndexed<R, N> {
  override staticBindGroup: BindGroup<
    BGLayout<{
      mySampler: SampLayout<ShaderStage.FRAGMENT, 'sampler'>;
      diffuseTexture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
    }>
  >;
  constructor(
    drawableProps: Omit<DrawableProps<N>, 'label'> & {
      renderPipeline: R;
      vertexBuffers: MappedVertexBuffers<R>;
    },
    layout: RenderPipelineLayout<
      readonly [
        BGLayout,
        BGLayout,
        BGLayout,
        BGLayout<{
          mySampler: SampLayout<ShaderStage.FRAGMENT, 'sampler'>;
          diffuseTexture: TextLayout<ShaderStage.FRAGMENT, 'texture_2d<f32>'>;
        }>,
      ]
    >,
    private texture: TextureView<
      Texture<GPUTextureFormat, TEXTURE_BINDING_TEXTURE>
    >,
    private sampler: GPUSampler,
    drawableDirectProps?: DrawableDirectProps,
    drawableIndexedProps: DrawableIndexedProps = {},
  ) {
    super(drawableProps, drawableDirectProps, drawableIndexedProps);

    this.staticBindGroup = new BindGroup(
      layout.bindGroupLayouts[3],
      'LightsTextureDrawableIndexed_static',
      //@ts-expect-error
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
