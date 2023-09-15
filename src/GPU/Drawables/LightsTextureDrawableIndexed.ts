import type {
  DrawableDirectProps,
  MappedVertexBuffers,
} from './DrawableDirect.js';
import type { RenderPipelineProps } from '../RenderPipeline.js';
import type { DataNode } from '../../nodes/DataNode.js';
import {
  DrawableIndexed,
  type DrawableIndexedProps,
} from './DrawableIndexed.js';
import type { DrawableProps } from './Drawable.js';
import {
  type BGLayout,
  BindGroup,
  type FragmentShader,
  type SampLayout,
  type ShaderStage,
  type TEXTURE_BINDING_TEXTURE,
  type TextLayout,
  type Texture,
  type TextureView,
  type VertexShader,
  type RenderPipelineLayout,
} from '../../webgpu-ts/index.js';
import type { Engine } from 'engine.js';
import { gpu_memory_index_size } from '../../GPU/Shaders/ShaderBuilders.js';
declare const engine: Engine;

/**
 * Drawable that is used with lightsTextureBindGroup
 */
export class LightsTextureDrawableIndexed<
  R extends RenderPipelineProps<VertexShader, FragmentShader>,
  N extends DataNode = DataNode,
> extends DrawableIndexed<R, N> {
  textureBindGroup: BindGroup<
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
    const textureBindGroup = new BindGroup(
      layout.bindGroupLayouts[3],
      'LightsTextureDrawableIndexed_static',
      () => {
        return {
          diffuseTexture: this.texture,
          mySampler: this.sampler,
        };
      },
    );
    drawableProps.bindGroups = [
      {
        bindGroup: engine.gpu!.BindGroupPosition,
        offsets: [
          engine.rust.gpu_alignment(drawableProps.node.id) *
            gpu_memory_index_size,
        ],
      },
      {
        bindGroup: textureBindGroup,
      },
    ];
    super(drawableProps, drawableDirectProps, drawableIndexedProps);
    this.textureBindGroup = textureBindGroup;
    /*this.staticBindGroup = new BindGroup(
      layout.bindGroupLayouts[3],
      'LightsTextureDrawableIndexed_static',
      () => {
        return {
          diffuseTexture: this.texture,
          mySampler: this.sampler,
        };
      },
    );*/
  }
  setTexture(
    texture: TextureView<Texture<GPUTextureFormat, TEXTURE_BINDING_TEXTURE>>,
  ) {
    this.texture = texture;
    this.textureBindGroup.destroy();
    //this.staticBindGroup?.destroy();
  }
}
