import type { RenderPipelineProps } from '../RenderPipeline.js';
import type {
  AnyVertexStage,
  BindGroupLayoutEntry,
  Buffer,
  VERTEX_BUFFER,
  VertexShader,
  VertexShaderFunction,
} from '../../webgpu-ts/index.js';
import { Drawable, type DrawableProps } from './Drawable.js';
import type { MainNode } from '../../MainNode.js';
import type { Engine } from '../../engine.js';
import { gpu_memory_index_size } from '../Shaders/ShaderBuilders.js';
declare const engine: Engine;

export type MappedVertexBuffers<
  R extends RenderPipelineProps,
  B extends readonly {
    [index: string]: BindGroupLayoutEntry<AnyVertexStage>;
  }[] = readonly {
    [index: string]: BindGroupLayoutEntry<AnyVertexStage>;
  }[],
> =
  R extends RenderPipelineProps<infer VERTEX_SHADER>
    ? //extract VertexBuffers
      VERTEX_SHADER extends VertexShader<{
        [index: string]: VertexShaderFunction<B, infer V>;
      }>
      ? Readonly<{
          [Property in keyof V]:
            | rust_array_ptr<'f32'>
            | rust_array_ptr<'position'>
            | rust_array_ptr<'position_and_normal'>
            | rust_array_ptr<'position2d_and_uv'>
            | Buffer<VERTEX_BUFFER>
            | GPUBuffer;
        }>
      : []
    : never;

export type DrawableDirectProps = {
  instanceCount?: number;
  firstInstance?: number;
  /**
   * Force only this amount of positions to drawn.
   * If not set, use vertexbuffer length by default
   */
  positionsCount?: number;
};

export abstract class DrawableDirect<N extends MainNode> extends Drawable<N> {
  constructor(
    drawableProps: DrawableProps<N>,
    { instanceCount = 1, firstInstance = 0 }: DrawableDirectProps = {},
  ) {
    const firstPipelinelayout =
      drawableProps.renderPipeline.builder.vertexShader.props;
    /**
     * Find matching bindgrouplayouts for bindgroups that was supplied with drawable,
     * and set supplied bindgroups to correct order
     */
    const bindgroups =
      firstPipelinelayout.pipelineLayouts[0]!.bindGroupLayouts.map(
        (bgLayout) => {
          if (
            bgLayout === engine.gpu!.pipelineLayouts.BindGroupLayoutPosition
          ) {
            return {
              bindGroup: engine.gpu!.BindGroupPosition,
              offsets: [
                engine.rust.gpu_alignment(drawableProps.node.id) *
                  gpu_memory_index_size,
              ],
            };
          }
          return drawableProps.bindGroups.find((bindGroup) => {
            return bindGroup.bindGroup.layout === bgLayout;
          });
        },
      );
    super({
      ...drawableProps, //TODO: Divide bindgrouplayouts to shared and non shared to get rid of filtering here
      bindGroups: bindgroups.filter((bg) => bg !== undefined),
    });
    engine.rust.set_drawble_direct(this.node.id, instanceCount, firstInstance);
  }
  protected set firstInstance(first_instance: number) {
    engine.rust.set_first_instance(this.node.id, first_instance);
  }
  protected get firstInstance() {
    return engine.rust.get_first_instance(this.node.id);
  }
  protected set instanceCount(count: number) {
    engine.rust.set_instance_count(this.node.id, count);
  }
  protected get instanceCount() {
    return engine.rust.get_instance_count(this.node.id);
  }
}
