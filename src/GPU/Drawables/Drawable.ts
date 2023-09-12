import {
  RenderPipelineVariant,
  type RenderPass,
} from '../RenderPasses/RenderPass.js';

import type { Engine, rust_vec_ptr } from '../../engine.js';
import { MainNode } from '../../MainNode.js';
import { LegacyRenderPipeline } from 'GPU/RenderPipeline.js';
import {
  BindGroup,
  Buffer,
  type BufferProps,
  BufferUsageEnums,
  type VERTEX_BUFFER,
  RenderBundleEncoder,
} from '../../webgpu-ts/index.js';
declare const engine: Engine;

export type DrawableProps<N extends MainNode> = {
  renderPipeline: Readonly<LegacyRenderPipeline>;
  renderPasses?: Set<RenderPass> | undefined;
  bindGroups?: { bindGroup: BindGroup; offsets?: number[] }[];
  vertexBuffers:
    | readonly {
        view: rust_vec_ptr<'f32'> | Buffer<VERTEX_BUFFER>;
        stride: number;
      }[]
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
  #renderList: Map<RenderPass, Set<Drawable<MainNode>>> = new Map();
  public renderPipeline: Readonly<LegacyRenderPipeline>;
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
      const fragmentEntry =
        this.renderPipeline.props.connections[rp.entryPoint];
      if (!fragmentEntry) {
        throw new Error(
          'Fragmentshader has no corresponding entry for output ' +
            rp.entryPoint,
        );
      }
      let variantPP = rp.renderPipelines.get(renderPipeline.props.builder);
      if (!variantPP) {
        /*const params = {
            ...renderPipeline.props.descriptor,
            ...rp.onDecoratePipeline(renderPipeline),
            label:
              'renderPipeline:' +
              renderPipeline.props.label +
              ' RenderPass:' +
              rp.label,
          };*/
        variantPP = this.renderPipeline.props.builder
          .build({
            //primitive, multisample, label
            ...renderPipeline.props.descriptor,
            ...rp.onDecoratePipeline(renderPipeline),
            fragment: {
              entryPoint: fragmentEntry,
              targets: Object.values(rp.colorRenderTargets),
            },
            label:
              'renderPipeline:' +
              renderPipeline.props.label +
              ' RenderPass:' +
              rp.label,

            vertex: {
              entryPoint: rp.entryPoint,
            },
          })
          .then((variantPipeline) => {
            variantPipeline.drawables.push(this);
            variantPP = new RenderPipelineVariant(
              variantPipeline,
              new Set<Drawable>(),
            );
            // Replace promise with real object
            rp.renderPipelines.set(renderPipeline.props.builder, variantPP);
            rp.onRenderPipelinesChange.forEach((cb) => cb());
            return variantPP;
          });
        // Save promise
        rp.renderPipelines.set(renderPipeline.props.builder, variantPP);
      }
      // variabtP can be either a promise or results of a promise
      if (variantPP instanceof Promise) {
        variantPP
          .then((variant) => {
            if (this.destroyed) return;
            this.#renderList.set(rp, variant.addRootDrawable(this));
            rp.bundles.forEach((b) => b.destroy());
          })
          .catch((err) => engine.showError(err));
      } else {
        this.#renderList.set(rp, variantPP.addRootDrawable(this));
        rp.bundles.forEach((b) => b.destroy());
      }
    });
  }

  //staticBindGroup?: BindGroup;
  destroy(preserveVerticeBuffers: number[] = []): void {
    this.#renderList.forEach((Drawables) => Drawables.delete(this));
    this.vertexBuffers.forEach((b, key) => {
      if (!preserveVerticeBuffers.includes(key)) b.buffer.destroy();
    });
    this.destroyed = true;
  }
  setVertexBuffer(
    index: number,
    buffer: { view: rust_vec_ptr<'f32'>; stride: number },
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
    buffer: {
      view: rust_vec_ptr<'f32'> | Buffer<VERTEX_BUFFER>;
      stride: number;
    },
    destroyOld?: boolean,
    GPUoffset?: number,
    size?: number,
  ): Buffer<VERTEX_BUFFER>;
  setVertexBuffer(
    index: number,
    buffer: {
      view: rust_vec_ptr<'f32'> | Buffer<VERTEX_BUFFER>;
      stride: number;
    },
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
    if (buffer.view instanceof Buffer)
      var Tbuffer = buffer as {
        view: Buffer<VERTEX_BUFFER>;
        stride: number;
      };
    else {
      //const gpu = this.renderPipeline.props.vertexShader.props.gpu;
      const ptr = buffer.view[0];
      const len =
        (buffer.view[1] * Float32Array.BYTES_PER_ELEMENT) /
        Uint8Array.BYTES_PER_ELEMENT;
      var Tbuffer = {
        stride: buffer.stride,
        view: new Buffer(
          {
            gpu: engine.gpu!.device,
            label: 'DrawableVertex_' + this.node.label,
            size: buffer.view[1] * Float32Array.BYTES_PER_ELEMENT,
            usages: BufferUsageEnums.VERTEX,
            vertexStride: buffer.stride,
          } as BufferProps<VERTEX_BUFFER>,
          (b) => {
            const buff = new Uint8Array(b.getMappedRange());
            buff.set(new Uint8Array(engine.rust.memory.buffer, ptr, len));
          },
        ),
      };
    }
    this.vertexBuffers[index] = {
      buffer: Tbuffer.view,
      offset: GPUoffset,
      size,
    };
    return Tbuffer.view;
  }
  abstract render(
    renderEncoder: RenderBundleEncoder | GPURenderPassEncoder,
  ): void;
}
