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
  get_raw_buffer(
    buffer: rust_pointer<'GPUBuffer'>,
  ): Externref<false, GPUBuffer>;
};

export const BufferExports = {
  map_state({ externref: buffer }: Externref<boolean, GPUBuffer>) {
    const mapState = buffer.mapState;
    if (mapState === 'unmapped') return 0;
    if (mapState === 'pending') return 1;
    return 2;
  },
  map_write_async(
    { externref: buffer }: Externref<boolean, GPUBuffer>,
    offset: number,
    size: number,
  ) {
    buffer.mapAsync(GPUMapMode.WRITE, offset, size).catch((err) => {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn(err);
      } else {
        engine.showError(err);
      }
    });
  },
  set_mapped_range(
    { externref: buffer }: Externref<boolean, GPUBuffer>,
    offset: number,
    size: number,
    buffer_offset: GPUSize64,
  ) {
    const data = new Uint8Array(engine.rust.memory.buffer, offset, size);
    new Uint8Array(buffer.getMappedRange(buffer_offset, size)).set(data);
  },
  unmap({ externref: buffer }: Externref<boolean, GPUBuffer>) {
    buffer.unmap();
  },
};
