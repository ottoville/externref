import type { Engine } from '../../engine.js';
declare const engine: Engine;

export type BufferInterface = {
  create_mapped_gpu_buffer_copysrc(
    device: GPUDevice,
    length: number,
    label: string,
  ): rust_pointer<'GPUBuffer'>;
  create_mappadle_gpu_buffer_copydst_mapread(
    device: GPUDevice,
    length: number,
    label: string,
  ): rust_pointer<'GPUBuffer'>;
  create_copysrc_storage_copydst_buffer(
    device: GPUDevice,
    length: number,
  ): rust_pointer<'GPUBuffer'>;

  get_raw_buffer(buffer: rust_pointer<'GPUBuffer'>): GPUBuffer;

  buffer_mapped_write(
    size: number,
    offset: number,
    rust_buffer: rust_pointer<'buffer'>,
    cb: rust_pointer<'fn'>,
  ): void;
  buffer_mapped_write_error(
    rust_buffer: rust_pointer<'buffer'>,
    cb: rust_pointer<'fn'>,
    error: string,
  ): void;
  buffer_mapped_read(
    size: number,
    offset: number,
    rust_buffer: rust_pointer<'buffer'>,
    cb: rust_pointer<'fn'>,
  ): void;
  buffer_mapped_read_error(
    rust_buffer: rust_pointer<'buffer'>,
    cb: rust_pointer<'fn'>,
    error: string,
  ): void;
};

export const BufferExports = {
  destroy(buffer: GPUBuffer) {
    buffer.destroy();
  },
  get_mapped_range(
    buffer: GPUBuffer,
    offset: number,
    size: number,
    buffer_offset: GPUSize64,
  ) {
    const data = new Uint8Array(engine.rust.memory.buffer, offset, size);
    const arr = new Uint8Array(buffer.getMappedRange(buffer_offset, size));
    data.set(arr);
  },
  map_read_async(
    index: number,
    offset: number,
    size: number,
    rust_buffer: rust_pointer<'buffer'>,
    cb: rust_pointer<'fn'>,
  ) {
    const buffer = engine.rust.externrefs.get(index) as GPUBuffer;
    buffer
      .mapAsync(GPUMapMode.READ, offset, size)
      .then(() => {
        try {
          engine.rust.buffer_mapped_read(size, offset, rust_buffer, cb);
        } catch (err) {
          // Catch possible error in rust to avoid exception leaking
          // into outer catch which is reserved only for "getFileHandle" throws.
          console.error(err);
        }
      })
      .catch((err: RangeError | DOMException) => {
        engine.rust.buffer_mapped_read_error(rust_buffer, cb, err.message);
      });
  },
  map_state(buffer: GPUBuffer) {
    const mapState = buffer.mapState;
    if (mapState === 'unmapped') return 0;
    if (mapState === 'pending') return 1;
    return 2;
  },
  map_write_async(
    index: number,
    offset: number,
    size: number,
    rust_buffer: rust_pointer<'buffer'>,
    cb: rust_pointer<'fn'>,
  ) {
    const buffer = engine.rust.externrefs.get(index) as GPUBuffer;

    buffer
      .mapAsync(GPUMapMode.WRITE, offset, size)
      .then(() => {
        try {
          engine.rust.buffer_mapped_write(size, offset, rust_buffer, cb);
        } catch (err) {
          // Catch possible error in rust to avoid exception leaking
          // into outer catch which is reserved only for "getFileHandle" throws.
          console.error(err);
        }
      })
      .catch((err) => {
        engine.rust.buffer_mapped_write_error(rust_buffer, cb, err.message);
      });
  },
  set_mapped_range(
    buffer: GPUBuffer,
    offset: number,
    size: number,
    buffer_offset: GPUSize64,
  ) {
    const data = new Uint8Array(engine.rust.memory.buffer, offset, size);
    new Uint8Array(buffer.getMappedRange(buffer_offset, size)).set(data);
  },
  unmap(buffer: GPUBuffer) {
    buffer.unmap();
  },
};
