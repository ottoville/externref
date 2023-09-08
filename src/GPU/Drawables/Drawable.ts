import {
  RenderPipelineVariant,
  type RenderPass,
} from '../RenderPasses/RenderPass.js';
import { GPU } from '../../GPU.js';

import type { Engine, rust_vec_ptr } from '../../engine.js';
import { BindGroup } from '../BindGroup.js';
import { RenderPipeline } from '../RenderPipeline.js';
import { MainNode } from '../../MainNode.js';
import {
  Buffer2,
  type BufferProps,
  BufferUsageEnums,
  type VERTEX_BUFFER,
} from '../Buffer/Buffer2.js';
import { RenderBundleEncoder } from '../RenderBundleEncoder.js';
declare const engine: Engine;

export type DrawableProps<N extends MainNode> = {
  renderPipeline: Readonly<RenderPipeline>;
  renderPasses?: Set<RenderPass> | undefined;
  dynamicBindGroups?: [BindGroup, number][];
  vertexBuffers:
    | readonly {
        view: rust_vec_ptr<'f32'> | Buffer2<VERTEX_BUFFER>;
        stride: number;
      }[]
    | undefined;
  node: N;
};
export abstract class Drawable<N extends MainNode = MainNode> {
  node: N;
  vertexBuffers: Map<
    number,
    {
      buffer: { stride: number; view: Buffer2<VERTEX_BUFFER> };
      offset: number | undefined;
      size: number | undefined;
    }
  > = new Map();
  #renderList: Map<RenderPass, Set<Drawable<MainNode>>> = new Map();
  public renderPipeline: Readonly<RenderPipeline>;
  protected renderPasses: Set<RenderPass>;
  #dynamicBindGroups: [BindGroup, number][];
  destroyed = false;
  constructor({
    renderPipeline,
    renderPasses = new Set([engine.gpu!.renderPassScreen]),
    dynamicBindGroups = [],
    vertexBuffers = [],
    node,
  }: Readonly<DrawableProps<N>>) {
    this.node = node;
    engine.rust.add_drawble(this.node.id);

    this.renderPipeline = renderPipeline;
    this.renderPasses = renderPasses;
    this.#dynamicBindGroups = dynamicBindGroups;

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
      let variantPP = rp.renderPipelines.get(renderPipeline);
      if (!variantPP) {
        if (this.renderPipeline.props.builder) {
          var nativePipeline = this.renderPipeline.props.builder.build({
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
          });
        } else {
          const params = {
            ...renderPipeline.props.descriptor,
            layout: renderPipeline.pipelineLayout.layout,
            ...rp.onDecoratePipeline(renderPipeline),
            label:
              'renderPipeline:' +
              renderPipeline.props.label +
              ' RenderPass:' +
              rp.label,
          };
          console.debug(
            'Create renderpipeline ',
            renderPipeline.props.label,
            params,
          );
          var nativePipeline = rp.gpu.device.createRenderPipelineAsync(params);
        }
        variantPP = nativePipeline
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
            variantPP = new RenderPipelineVariant(
              variantPipeline,
              new Set<Drawable>(),
            );
            // Replace promise with real object
            rp.renderPipelines.set(renderPipeline, variantPP);
            rp.onRenderPipelinesChange.forEach((cb) => cb());
            return variantPP;
          });
        // Save promise
        rp.renderPipelines.set(renderPipeline, variantPP);
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

  staticBindGroup?: BindGroup;
  destroy(preserveVerticeBuffers: number[] = []): void {
    this.#renderList.forEach((Drawables) => Drawables.delete(this));
    this.vertexBuffers.forEach((b, key) => {
      if (!preserveVerticeBuffers.includes(key)) b.buffer.view.destroy();
    });
    this.destroyed = true;
  }
  setVertexBuffer(
    index: number,
    buffer: { view: rust_vec_ptr<'f32'>; stride: number },
    destroyOld?: boolean,
  ): Buffer2<VERTEX_BUFFER>;
  setVertexBuffer<T extends Buffer2<VERTEX_BUFFER>>(
    index: number,
    buffer: T,
    destroyOld?: boolean,
    GPUoffset?: number,
    size?: number,
  ): T;
  setVertexBuffer(
    index: number,
    buffer: {
      view: rust_vec_ptr<'f32'> | Buffer2<VERTEX_BUFFER>;
      stride: number;
    },
    destroyOld?: boolean,
    GPUoffset?: number,
    size?: number,
  ): Buffer2<VERTEX_BUFFER>;
  setVertexBuffer(
    index: number,
    buffer: {
      view: rust_vec_ptr<'f32'> | Buffer2<VERTEX_BUFFER>;
      stride: number;
    },
    destroyOld = true,
    GPUoffset?: number,
    size?: number,
  ): Buffer2<VERTEX_BUFFER> {
    if (destroyOld) {
      const Tbuffer = this.vertexBuffers.get(index);
      if (Tbuffer) {
        Tbuffer.buffer.view.destroy();
      }
    }
    if (buffer.view instanceof Buffer2)
      var Tbuffer = buffer as {
        view: Buffer2<VERTEX_BUFFER>;
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
        view: new Buffer2(
          {
            gpu: engine.gpu!,
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
    this.vertexBuffers.set(index, {
      buffer: Tbuffer,
      offset: GPUoffset,
      size,
    });
    return Tbuffer.view;
  }
  abstract render(
    renderEncoder: GPURenderBundleEncoder | GPURenderPassEncoder,
    renderPass: RenderPass,
  ): void;
  draw(
    renderPass: RenderPass,
    renderEncoder: RenderBundleEncoder | GPURenderPassEncoder,
    BindGroupsStart: number,
    dynamicIndex: number[],
  ) {
    const encoder =
      renderEncoder instanceof RenderBundleEncoder
        ? renderEncoder.renderBundleEncoder
        : renderEncoder;

    this.#dynamicBindGroups.forEach(([{ bindGroup }, offset], i) => {
      const di = dynamicIndex[i];
      if (di) {
        encoder.setBindGroup(di, bindGroup, [
          offset * GPU.gpu_memory_index_size,
        ]);
      }
    });
    if (this.staticBindGroup) {
      encoder.setBindGroup(
        BindGroupsStart++,
        renderEncoder instanceof RenderBundleEncoder
          ? this.staticBindGroup.getForRenderBundle(renderEncoder)
          : this.staticBindGroup.bindGroup,
      );
    }
    this.vertexBuffers.forEach((buffer, index) =>
      encoder.setVertexBuffer(
        index,
        buffer.buffer.view.getVertexBinding(renderPass),
        buffer.offset,
        buffer.size,
      ),
    );
    console.debug('draw', this.node.label);
    this.render(encoder, renderPass);
  }
}
