import {
  Buffer,
  COPY_DST_BUFFER,
  COPY_SRC_BUFFER,
  type BufferUsageEnums,
} from './webgpu-ts/index.js';
import type { Engine } from './engine.js';
import { stringFromPtr } from './utils.js';

declare const engine: Engine;

export type BufferInterface = {
  create_mapped_GPU_buffer_copysrc(
    length: number,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): rust_pointer<'GPUBuffer'>;
};

export const BufferExports = {
  copy_from(
    { externref: commandEncoder }: externref<boolean, GPUCommandEncoder>,
    { externref: destination }: externref<boolean, Buffer<COPY_DST_BUFFER>>,
    { externref: source }: externref<boolean, Buffer<COPY_SRC_BUFFER>>,
    sourceOffset: GPUSize64,
    destinationOffset: GPUSize64,
    copySize?: GPUSize64,
  ) {
    destination.copyFrom(
      commandEncoder,
      source,
      sourceOffset,
      destinationOffset,
      copySize,
    );
  },
  create_gpu_buffer(
    size: number,
    label_vec_ptr: rust_pointer<'label'>,
    usages: BufferUsageEnums,
    mapped: boolean,
    ownedByJS: boolean,
  ) {
    const label = stringFromPtr(engine.rust.memory, label_vec_ptr);
    return {
      externref: new Buffer({
        gpu: engine.gpu!.device,
        label,
        mappedAtCreation: mapped,
        size,
        usages,
      }),
      ownedByJS,
    } as const;
  },
  set_mapped_range(
    { externref: buffer }: externref<boolean, Buffer<BufferUsageEnums, true>>,
    offset: number,
    size: Word<'dword'>,
    buffer_offset: GPUSize64,
    buffer_size: GPUSize64,
  ) {
    const data = new Uint8Array(engine.rust.memory.buffer, offset, size);
    new Uint8Array(buffer.getMappedRange(buffer_offset, buffer_size)).set(data);
  },
  unmap({
    externref: buffer,
  }: externref<boolean, Buffer<BufferUsageEnums, true>>) {
    buffer.unmap();
  },
};
