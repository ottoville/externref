import {
  Buffer,
  COPY_DST_BUFFER,
  type BufferUsageEnums,
} from '../webgpu-ts/index.js';
import type { Engine } from '../engine.js';
import { Externref } from '../externref.js';

declare const engine: Engine;

export type BufferInterface = {
  create_mapped_GPU_buffer_copysrc(
    device: Externref<true, GPUDevice>,
    length: number,
    label_ptr: number,
    label_len: number,
    label_cap: number,
  ): rust_pointer<'GPUBuffer'>;
  get_raw_buffer<U extends BufferUsageEnums, M extends boolean>(
    buffer: rust_pointer<'GPUBuffer'>,
  ): Externref<false, Buffer<U, M>>;
};

export const BufferExports = {
  map_state({
    externref: buffer,
  }: Externref<boolean, Buffer<BufferUsageEnums.MAP_WRITE>>) {
    const mapState = buffer.mapState();
    if (mapState === 'unmapped') return 0;
    if (mapState === 'pending') return 1;
    return 2;
  },
  map_write_async(
    {
      externref: buffer,
    }: Externref<boolean, Buffer<BufferUsageEnums.MAP_WRITE>>,
    offset: number,
    size: number,
  ) {
    buffer.map_write(offset, size).catch((err) => engine.showError(err));
  },
  set_mapped_range(
    { externref: buffer }: Externref<boolean, Buffer<BufferUsageEnums, true>>,
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
  }: Externref<boolean, Buffer<BufferUsageEnums, true>>) {
    buffer.unmap();
  },
  write(
    { externref: destination }: Externref<boolean, Buffer<COPY_DST_BUFFER>>,
    sourceOffset: GPUSize64,
    copySize: GPUSize64,
    destinationOffset: GPUSize64,
  ) {
    destination.write(
      destinationOffset,
      engine.rust.memory.buffer,
      sourceOffset,
      copySize,
    );
  },
};
