import type { Engine } from '../engine.js';
import { stringFromPtr } from '../utils.js';

declare const engine: Engine;

export const CommandEncoderInterface = {
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
