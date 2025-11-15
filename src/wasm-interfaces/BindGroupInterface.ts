import { BGLayout } from '../webgpu-ts/index.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

const textDecoder = new TextDecoder();

export const BindGroupExports = {
  create_bind_group_descriptor(
    layout: BGLayout | GPUBindGroupLayout,
    label_ptr: number,
    label_len: number,
  ): GPUBindGroupDescriptor {
    const label = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
    return {
      entries: [],
      label,
      layout: layout instanceof BGLayout ? layout.layout : layout,
    };
  },
  create_buffer_binding(
    buffer: GPUBuffer,
    offset: GPUSize64,
    size: GPUSize64,
  ): GPUBufferBinding {
    return {
      buffer,
      offset,
      size,
    };
  },
  push_to_bind_group_descriptor(
    descriptor: GPUBindGroupDescriptor & { entries: GPUBindGroupEntry[] },
    binding: number,
    resource: GPUBufferBinding,
  ) {
    descriptor.entries.push({
      binding,
      resource,
    });
  },
};
