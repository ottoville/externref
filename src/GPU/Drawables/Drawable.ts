import { type RenderPass } from '../RenderPasses/RenderPass.js';

import type { Engine } from '../../engine.js';
import { MainNode } from '../../MainNode.js';
import type { RenderPipelineProps } from 'GPU/RenderPipeline.js';
import {
  BindGroup,
  Buffer,
  BufferUsageEnums,
  type VERTEX_BUFFER,
  type RenderPipelineBuilderDesc,
  Drawable as DrawableType,
  type IRenderBundleEncoder,
} from '../../webgpu-ts/index.js';
declare const engine: Engine;

export type DrawableProps<N extends MainNode> = {
  renderPipeline: RenderPipelineProps;
  renderPasses?: Set<RenderPass>;
  bindGroups: { bindGroup: BindGroup; offsets?: number[] }[];
  vertexBuffers:
    | readonly (
        | rust_array_ptr<'f32'>
        | rust_array_ptr<'position'>
        | rust_array_ptr<'position_and_normal'>
        | rust_array_ptr<'position2d_and_uv'>
        | Buffer<VERTEX_BUFFER>
      )[]
    | undefined;
  node: N;
};
export abstract class Drawable<N extends MainNode = MainNode>
  implements DrawableType
{
  node: N;
  vertexBuffers: {
    buffer: Buffer<VERTEX_BUFFER>;
    offset?: GPUSize64 | undefined;
    size?: GPUSize64 | undefined;
  }[] = [];
  public renderPipeline: RenderPipelineProps;
  renderPasses: Set<RenderPass>;
  destroyed = false;
  readonly bindGroups: readonly { bindGroup: BindGroup; offsets?: number[] }[];
  constructor({
    renderPipeline,
    renderPasses = new Set([engine.gpu!.renderPassScreen]),
    bindGroups,
    vertexBuffers = [],
    node,
  }: Readonly<DrawableProps<N>>) {
    this.bindGroups = Object.freeze(bindGroups ?? []);
    this.node = node;
    engine.rust.add_drawble(this.node.id);

    this.renderPipeline = renderPipeline;
    this.renderPasses = renderPasses;

    vertexBuffers?.forEach((vertexBuffer, i) => {
      this.setVertexBuffer(i, vertexBuffer);
    });
    this.renderPasses.forEach((rp) => {
      const fragmentEntry = this.renderPipeline.connections[rp.entryPoint];
      if (!fragmentEntry) {
        throw new Error(
          'Fragmentshader has no corresponding entry for output ' +
            rp.entryPoint,
        );
      }
      let variantPP = rp.renderPipelines.get(renderPipeline.builder);
      if (!variantPP) {
        const renderPipelineDescriptor: RenderPipelineBuilderDesc = {
          fragment: {
            entryPoint: fragmentEntry,
          },
          label:
            'renderPipeline:' +
            renderPipeline.label +
            ' RenderPass:' +
            rp.props.label,
          renderpass: rp,
          vertex: {
            entryPoint: rp.entryPoint,
          },
        };
        if (renderPipeline.primitive)
          renderPipelineDescriptor.primitive = renderPipeline.primitive;
        if (rp.props.sampleCount && rp.props.sampleCount > 1)
          renderPipelineDescriptor.multisample = {
            count: rp.props.sampleCount,
          };
        if (rp.onDecoratePipeline)
          rp.onDecoratePipeline(renderPipeline, renderPipelineDescriptor);
        variantPP = this.renderPipeline.builder
          .build(renderPipelineDescriptor)
          .then((variantPipeline) => {
            rp.onRenderPipelinesChange.forEach((cb) => cb());
            return variantPipeline;
          });
        // Save promise
        rp.renderPipelines.set(renderPipeline.builder, variantPP);
      }
      // variabtP can be either a promise or results of a promise
      if (variantPP instanceof Promise) {
        variantPP
          .then((variant) => {
            if (this.destroyed) return;
            variant.addDrawable(this);
            rp.bundles.forEach((b) => b.destroy());
          })
          .catch((err) => engine.showError(err));
      } else {
        variantPP.addDrawable(this);
        rp.bundles.forEach((b) => b.destroy());
      }
    });
  }

  remove(): void {
    this.renderPasses.forEach((rp) => {
      rp.renderPipelines.forEach((renderPipeline) => {
        if (renderPipeline instanceof Promise) {
          renderPipeline
            .then((renderPipelineNotPromise) => {
              renderPipelineNotPromise.removeDrawable(this);
            })
            .catch((err) => {
              engine.showError(err);
            });
        } else {
          renderPipeline.removeDrawable(this);
        }
      });
    });
  }
  destroy(preserveVerticeBuffers: number[] = []): void {
    this.remove();
    this.vertexBuffers.forEach((b, key) => {
      if (!preserveVerticeBuffers.includes(key)) b.buffer.destroy();
    });
    this.destroyed = true;
  }
  onVertexBufferChange: ((index: number) => void)[] = [];
  setVertexBuffer(
    index: number,
    buffer: rust_array_ptr<'f32'>,
    destroyOld?: boolean,
  ): Buffer<VERTEX_BUFFER>;
  setVertexBuffer<T extends Buffer<VERTEX_BUFFER>>(
    index: number,
    buffer: T,
    destroyOld?: boolean,
    GPUoffset?: number,
    size?: number,
  ): T;
  setVertexBuffer(
    index: number,
    buffer:
      | Buffer<VERTEX_BUFFER>
      | rust_array_ptr<'f32'>
      | rust_array_ptr<'position_and_normal'>
      | rust_array_ptr<'position2d_and_uv'>
      | rust_array_ptr<'position'>,
    destroyOld?: boolean,
    GPUoffset?: number,
    size?: number,
  ): Buffer<VERTEX_BUFFER>;
  setVertexBuffer(
    index: number,
    buffer:
      | rust_array_ptr<'f32'>
      | rust_array_ptr<'position_and_normal'>
      | rust_array_ptr<'position'>
      | Buffer<VERTEX_BUFFER>,
    destroyOld = true,
    GPUoffset?: number,
    size?: number,
  ): Buffer<VERTEX_BUFFER> {
    if (buffer instanceof Buffer) {
      var Tbuffer = buffer;
    } else {
      const ptr = buffer[0];
      const len =
        (buffer[1] * Float32Array.BYTES_PER_ELEMENT) /
        Uint8Array.BYTES_PER_ELEMENT;
      const TbufferMapped = new Buffer({
        gpu: engine.gpu!.device,
        label: 'DrawableVertex_' + this.node.label,
        mappedAtCreation: true,
        size: buffer[1] * Float32Array.BYTES_PER_ELEMENT,
        usages: BufferUsageEnums.VERTEX,
      });

      const buff = new Uint8Array(TbufferMapped.getMappedRange());
      buff.set(new Uint8Array(engine.rust.memory.buffer, ptr, len));
      var Tbuffer = TbufferMapped.unmap() as Buffer<VERTEX_BUFFER>;
    }
    const oldBuffer = this.vertexBuffers[index];
    if (oldBuffer) {
      // Destroy renderbundles that have reference to old buffer in order for new buffer to be rendered
      oldBuffer.buffer.renderBundles.forEach((b) => b.destroy());
      if (destroyOld) {
        oldBuffer.buffer?.destroy();
      }
    }
    this.vertexBuffers[index] = {
      buffer: Tbuffer,
      offset: GPUoffset,
      size,
    };
    if (oldBuffer) {
      this.onVertexBufferChange.forEach((cb) => cb(index));
    }
    return Tbuffer;
  }
  abstract render(
    renderEncoder: IRenderBundleEncoder | GPURenderPassEncoder,
  ): void;
}
