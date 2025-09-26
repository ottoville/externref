import { Externref } from 'externref.js';
import type { Engine } from '../engine.js';
import { Rust_Iterator } from '../utils.js';

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
    label_ptr: number,
    label_len: number,
    _iterator: Rust_Iterator<GPURenderPassColorAttachment | null>,
  ): GPURenderPassEncoder {
    /*const attachmentsIterator = rust_iterator_to_js(
      iterator,
      null,
      engine.rust.iterate_colorattachments,
    );*/
    //console.log('color attachments from rust', [...attachmentsIterator]);
    //  console.log('color attachments', renderpass.colorAttachments);
    const label = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
    return commandEncoder.beginRenderPass({
      ...renderpass,
      // colorAttachments: attachmentsIterator,
      label,
    });
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
