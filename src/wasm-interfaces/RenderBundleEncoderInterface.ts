import { Externref } from 'externref.js';
import { stringFromPtr } from '../utils.js';
import type { Engine } from '../engine.js';
import { textureFormatMapping } from './TextureInterface.js';
declare const engine: Engine;
const textDecoder = new TextDecoder();

export const RenderbundleEncoderInterface = {
  create_renderbundle_encoder(
    device: Externref<true, GPUDevice>,
    descriptor: GPURenderBundleEncoderDescriptor,
  ): GPURenderBundleEncoder {
    return device.externref.createRenderBundleEncoder(descriptor);
  },
  create_renderbundle_encoder_descriptor(
    color_formats_ptr: number,
    color_formats_len: number,
    label_ptr: number,
    label_len: number,
    sampleCount: number,
    depthReadOnly: boolean,
    stencilReadOnly: boolean,
    depthStencilFormat: number,
  ): GPURenderBundleEncoderDescriptor {
    const label = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
    const colorFormats = Array.from(
      new Uint32Array(
        engine.rust.memory.buffer,
        color_formats_ptr,
        color_formats_len,
      ),
    ).map((mapping) => textureFormatMapping[mapping]!);
    const descriptor: GPURenderBundleEncoderDescriptor = {
      colorFormats,
      depthReadOnly,
      label,
      sampleCount,
      stencilReadOnly,
    };
    if (depthStencilFormat >= 0) {
      descriptor.depthStencilFormat = textureFormatMapping[depthStencilFormat]!;
    }
    return descriptor;
  },

  do_record(
    cb: (
      renderBundleEncoder: GPURenderBundleEncoder,
      gpu_buffer: number,
      bind_group_position: rust_pointer<'bind_group_position'>,
      bindgroup_start_index: number,
    ) => void,
    encoder: GPURenderBundleEncoder,
    gpu_buffer: number,
    bind_group_position: rust_pointer<'bind_group_position'>,
    bindgroup_start_index: number,
  ) {
    cb(encoder, gpu_buffer, bind_group_position, bindgroup_start_index);
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
