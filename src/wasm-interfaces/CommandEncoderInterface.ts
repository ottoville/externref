import { Externref } from 'externref.js';
import type { Engine } from '../engine.js';
import { Rust_Iterator, rust_iterator_to_js } from '../utils.js';

declare const engine: Engine;
const textDecoder = new TextDecoder();

export const CommandEncoderInterface = {
  begin_compute_pass(
    commandEncoder: GPUCommandEncoder,
    label_ptr: number,
    label_len: number,
  ): GPUComputePassEncoder {
    const label = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
    return commandEncoder.beginComputePass({ label });
  },
  begin_render_pass(
    commandEncoder: GPUCommandEncoder,
    renderpass: GPURenderPassDescriptor,
    _renderpass: GPURenderPassDescriptor,
  ): GPURenderPassEncoder {
    return commandEncoder.beginRenderPass(renderpass);
  },
  copy_buffer_to_buffer(
    commandEncoder: GPUCommandEncoder,
    { externref: source }: Externref<boolean, GPUBuffer>,
    { externref: destination }: Externref<boolean, GPUBuffer>,
    sourceOffset: GPUSize64,
    destinationOffset: GPUSize64,
    copySize: GPUSize64,
  ) {
    commandEncoder.copyBufferToBuffer(
      source,
      sourceOffset,
      destination,
      destinationOffset,
      copySize,
    );
  },
  create_render_pass_descriptor(
    label_ptr: number,
    label_len: number,
    iterator: Rust_Iterator<GPURenderPassColorAttachment | null>,
    depthStencilAttachment: GPURenderPassDepthStencilAttachment | null,
  ): GPURenderPassDescriptor {
    const label = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
    const attachmentsIterator = rust_iterator_to_js(
      iterator,
      null,
      engine.rust.iterate_colorattachments,
    );
    const descriptor: GPURenderPassDescriptor = {
      colorAttachments: [...attachmentsIterator],
      label,
    };
    if (depthStencilAttachment) {
      descriptor.depthStencilAttachment = depthStencilAttachment;
    }
    return descriptor;
  },
  finish(
    commandEncoder: GPUCommandEncoder,
    label_ptr: number,
    label_len: number,
  ): GPUCommandBuffer {
    const label = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
    return commandEncoder.finish({ label });
  },
};
