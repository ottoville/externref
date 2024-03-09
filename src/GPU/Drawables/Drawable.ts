import { type RenderPass } from '../RenderPasses/RenderPass.js';

import type { Engine } from '../../engine.js';
import { MainNode } from '../../MainNode.js';
import type { RenderPipelineProps } from 'GPU/RenderPipeline.js';
import {
  BindGroup,
  Buffer,
  BufferUsageEnums,
  type VERTEX_BUFFER,
  RenderBundleEncoder,
  type RenderPipelineBuilderDesc,
} from '../../webgpu-ts/index.js';
declare const engine: Engine;

export type DrawableProps<N extends MainNode> = {
  renderPipeline: RenderPipelineProps;
  renderPasses?: Set<RenderPass>;
  bindGroups: { bindGroup: BindGroup; offsets?: number[] }[];
  vertexBuffers:
    | readonly (rust_array_ptr<'f32'> | Buffer<VERTEX_BUFFER>)[]
    | undefined;
  node: N;
};
export abstract class Drawable<N extends MainNode = MainNode> {
  node: N;
  vertexBuffers: {
    buffer: Buffer<VERTEX_BUFFER>;
    offset?: GPUSize64 | undefined;
    size?: GPUSize64 | undefined;
  }[] = [];
  vertexBuffers_legact: Map<
    number,
    {
      buffer: { stride: number; view: Buffer<VERTEX_BUFFER> };
      offset: number | undefined;
      size: number | undefined;
    }
  > = new Map();
  public renderPipeline: RenderPipelineProps;
  protected renderPasses: Set<RenderPass>;
  destroyed = false;
  bindGroups: { bindGroup: BindGroup; offsets?: number[] }[];
  constructor({
    renderPipeline,
    renderPasses = new Set([engine.gpu!.renderPassScreen]),
    bindGroups,
    vertexBuffers = [],
    node,
  }: Readonly<DrawableProps<N>>) {
    this.bindGroups = bindGroups ?? [];
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

  //staticBindGroup?: BindGroup;
  destroy(preserveVerticeBuffers: number[] = []): void {
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
    this.vertexBuffers.forEach((b, key) => {
      if (!preserveVerticeBuffers.includes(key)) b.buffer.destroy();
    });
    this.destroyed = true;
  }
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
    buffer: Buffer<VERTEX_BUFFER> | rust_array_ptr<'f32'>,
    destroyOld?: boolean,
    GPUoffset?: number,
    size?: number,
  ): Buffer<VERTEX_BUFFER>;
  setVertexBuffer(
    index: number,
    buffer: rust_array_ptr<'f32'> | Buffer<VERTEX_BUFFER>,
    destroyOld = true,
    GPUoffset?: number,
    size?: number,
  ): Buffer<VERTEX_BUFFER> {
    if (destroyOld) {
      const Tbuffer = this.vertexBuffers[index];
      if (Tbuffer) {
        Tbuffer.buffer?.destroy();
      }
    }
    if (buffer instanceof Buffer) var Tbuffer = buffer;
    else {
      const ptr = buffer[0];
      const len =
        (buffer[1] * Float32Array.BYTES_PER_ELEMENT) /
        Uint8Array.BYTES_PER_ELEMENT;
      var Tbuffer = new Buffer(
        {
          gpu: engine.gpu!.device,
          label: 'DrawableVertex_' + this.node.label,
          size: buffer[1] * Float32Array.BYTES_PER_ELEMENT,
          usages: BufferUsageEnums.VERTEX,
        },
        (b) => {
          const buff = new Uint8Array(b.getMappedRange());
          buff.set(new Uint8Array(engine.rust.memory.buffer, ptr, len));
        },
      ) as Buffer<VERTEX_BUFFER>;
    }
    this.vertexBuffers[index] = {
      buffer: Tbuffer,
      offset: GPUoffset,
      size,
    };
    return Tbuffer;
  }
  abstract render(
    renderEncoder: RenderBundleEncoder | GPURenderPassEncoder,
  ): void;
}
