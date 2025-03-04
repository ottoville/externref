import { Externref } from 'externref.js';
import { stringFromPtr } from '../utils.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export const RenderbundleEncoderInterface = {
  create_renderbundle_encoder(
    device: Externref<true, GPUDevice>,
    // TODO pass individual params of descriptor
    descriptor: GPURenderBundleEncoderDescriptor,
  ) {
    return device.externref.createRenderBundleEncoder(descriptor);
  },

  do_record(
    cb: (renderBundleEncoder: GPURenderBundleEncoder) => void,
    encoder: GPURenderBundleEncoder,
  ) {
    cb(encoder);
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
