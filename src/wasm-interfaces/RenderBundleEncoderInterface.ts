import { Externref } from 'externref.js';
import { stringFromPtr } from '../utils.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export const RenderbundleEncoderInterface = {
  create_renderbundle_encoder(
    device: Externref<true, GPUDevice>,
    // TODO pass individual params of descriptor
    descriptor: GPURenderBundleEncoderDescriptor,
    label_vec_ptr: rust_pointer<'label'>,
  ) {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);

    return device.externref.createRenderBundleEncoder({ ...descriptor, label });
  },

  do_record(
    cb: (
      renderBundleEncoder: GPURenderBundleEncoder,
      cameras: rust_pointer<'cameras'>,
      device: Externref<true, GPUDevice>,
      gpu_buffer: number,
      bind_group_position: rust_pointer<'bind_group_position'>,
    ) => void,
    encoder: GPURenderBundleEncoder,
    cameras: rust_pointer<'cameras'>,
    device: Externref<true, GPUDevice>,
    gpu_buffer: number,
    bind_group_position: rust_pointer<'bind_group_position'>,
  ) {
    cb(encoder, cameras, device, gpu_buffer, bind_group_position);
  },
  // TODO share interface with commandencoderinterface
  finish(
    commandEncoder: GPURenderBundleEncoder,
    label_vec_ptr: rust_pointer<'label'>,
  ) {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);
    return commandEncoder.finish({ label });
  },
};
