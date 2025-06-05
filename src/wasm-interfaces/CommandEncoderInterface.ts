import { Externref } from 'externref.js';
import type { Engine } from '../engine.js';
import { stringFromPtr } from '../utils.js';

declare const engine: Engine;

export const CommandEncoderInterface = {
  begin_compute_pass(
    commandEncoder: GPUCommandEncoder,
    label_vec_ptr: rust_pointer<'label'>,
  ): GPUComputePassEncoder {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);
    return commandEncoder.beginComputePass({ label });
  },
  begin_render_pass(
    commandEncoder: GPUCommandEncoder,
    renderpass: GPURenderPassDescriptor,
    label_vec_ptr: rust_pointer<'label'>,
  ): GPURenderPassEncoder {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);
    return commandEncoder.beginRenderPass({
      ...renderpass,
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
  create_gpu_command_encoder(
    label_vec_ptr: rust_pointer<'label'>,
  ): GPUCommandEncoder {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);
    return engine.gpu!.device.createCommandEncoder({ label });
  },
  finish(
    commandEncoder: GPUCommandEncoder,
    label_vec_ptr: rust_pointer<'label'>,
  ): GPUCommandBuffer {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);
    return commandEncoder.finish({ label });
  },
};
