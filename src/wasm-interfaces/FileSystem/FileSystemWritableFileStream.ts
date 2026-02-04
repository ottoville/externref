import type { Engine } from '../../engine.js';
declare const engine: Engine;

export const FileSystemWritableFileStreamInterface = {
  write(
    stream: FileSystemWritableFileStream,
    ptr: number,
    byte_len: number,
    position: number,
    cb: rust_pointer<'FSWritecallback'>,
  ) {
    stream
      .write({
        data: new Uint8Array(engine.rust.memory.buffer, ptr, byte_len),
        position,
        type: 'write',
      })
      .then(() => {
        try {
          engine.rust.write_ok(cb);
        } catch (err) {
          // Catch possible error in rust to avoid exception leaking
          // into outer catch which is reserved only for "getFileHandle" throws.
          console.error(err);
        }
      })
      .catch((err: DOMException | TypeError) => {
        engine.rust.write_error(cb, err.name!);
      });
  },
};

export type FileSystemWritableFileStreamImports = {
  write_ok(cb: rust_pointer<'FSWritecallback'>): void;
  write_error(cb: rust_pointer<'FSWritecallback'>, error: string): void;
};
