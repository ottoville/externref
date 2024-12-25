import { Externref } from 'externref.js';
import type { Engine } from '../engine.js';
import { stringFromPtr } from '../utils.js';
import { Buffer, COPY_DST_BUFFER, COPY_SRC_BUFFER } from 'webgpu-ts/Buffer.js';

declare const engine: Engine;

export const CommandEncoderInterface = {
  begin_compute_pass(
    commandEncoder: GPUCommandEncoder,
    label_vec_ptr: rust_pointer<'label'>,
  ): GPUComputePassEncoder {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);
    return commandEncoder.beginComputePass({ label });
  },
  copy_buffer_to_buffer(
    commandEncoder: GPUCommandEncoder,
    { externref: source }: Externref<boolean, Buffer<COPY_SRC_BUFFER>>,
    { externref: destination }: Externref<boolean, Buffer<COPY_DST_BUFFER>>,
    sourceOffset: GPUSize64,
    destinationOffset: GPUSize64,
    copySize: GPUSize64,
  ) {
    commandEncoder.copyBufferToBuffer(
      source.buffer,
      sourceOffset,
      destination.buffer,
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
