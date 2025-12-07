import type { Engine } from '../engine.js';

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
  ): GPURenderPassEncoder {
    return commandEncoder.beginRenderPass(renderpass);
  },
  copy_buffer_to_buffer(
    commandEncoder: GPUCommandEncoder,
    source: GPUBuffer,
    destination: GPUBuffer,
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
    depthStencilAttachment: GPURenderPassDepthStencilAttachment | null,
  ): GPURenderPassDescriptor & {
    colorAttachments: GPURenderPassColorAttachment[];
  } {
    const label = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
    const descriptor: GPURenderPassDescriptor & {
      colorAttachments: GPURenderPassColorAttachment[];
    } = {
      colorAttachments: [],
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
  push_color_attachment_to_render_pass_descriptor(
    renderpassdescriptor: GPURenderPassDescriptor & {
      colorAttachments: GPURenderPassColorAttachment[];
    },
    colorAttachment: GPURenderPassColorAttachment,
  ) {
    renderpassdescriptor.colorAttachments.push(colorAttachment);
  },
};
