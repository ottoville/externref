import type { Engine } from '../../engine.js';
declare const engine: Engine;

export const FileSystemFileHandleInterface = {
  create_writable(
    filesystemhandle: FileSystemFileHandle & {
      createWritable(
        options?: FileSystemCreateWritableOptions & {
          mode: 'exclusive' | 'siloed';
        },
      ): Promise<FileSystemWritableFileStream>;
    },
    keepExistingData: boolean,
    cb: rust_pointer<'createWritableCallback'>,
  ) {
    filesystemhandle
      .createWritable({
        keepExistingData,
        mode: 'siloed',
      })
      .then((stream) => {
        try {
          engine.rust.create_writable_callback(cb, stream);
        } catch (err) {
          // Catch possible error in rust to avoid exception leaking
          // into outer catch which is reserved only for "getFileHandle" throws.
          console.error(err);
        }
      })
      .catch((err: DOMException) => {
        engine.rust.create_writable_callback_error(cb, err.name);
      });
  },
  create_writable_exclusive(
    index: number,
    rust_filesystemhandle: rust_pointer<'filesystemhandle'>,
    keepExistingData: boolean,
    cb: rust_pointer<'createWritableCallbackExclusive'>,
  ) {
    const filesystemhandle = engine.rust.externrefs.get(
      index,
    ) as FileSystemFileHandle & {
      createWritable(
        options?: FileSystemCreateWritableOptions & {
          mode: 'exclusive' | 'siloed';
        },
      ): Promise<FileSystemWritableFileStream>;
    };
    filesystemhandle
      .createWritable({
        keepExistingData,
        mode: 'exclusive',
      })
      .then((stream) => {
        try {
          engine.rust.create_writable_callback_exclusive(
            cb,
            rust_filesystemhandle,
            stream,
          );
        } catch (err) {
          // Catch possible error in rust to avoid exception leaking
          // into outer catch which is reserved only for "getFileHandle" throws.
          console.error(err);
        }
      })
      .catch((err: DOMException) => {
        engine.rust.create_writable_callback_error_exclusive(
          cb,
          rust_filesystemhandle,
          err.name,
        );
      });
  },
  get_file(
    filesystemhandle: FileSystemFileHandle,
    cb: rust_pointer<'getFileCallback'>,
  ) {
    filesystemhandle
      .getFile()
      .then((file) => {
        try {
          engine.rust.get_file_callback(cb, file);
        } catch (err) {
          // Catch possible error in rust to avoid exception leaking
          // into outer catch which is reserved only for "getFileHandle" throws.
          console.error(err);
        }
      })
      .catch((err: DOMException) => {
        engine.rust.get_file_callback_error(cb, err.name);
      });
  },
};

export type FileSystemFileHandleImports = {
  create_writable_callback(
    cb: rust_pointer<'createWritableCallback'>,
    stream: FileSystemWritableFileStream,
  ): void;
  create_writable_callback_exclusive(
    cb: rust_pointer<'createWritableCallbackExclusive'>,
    rust_filesystemhandle: rust_pointer<'filesystemhandle'>,
    stream: FileSystemWritableFileStream,
  ): void;
  create_writable_callback_error(
    cb: rust_pointer<'createWritableCallback'>,
    error: string,
  ): void;
  create_writable_callback_error_exclusive(
    cb:
      | rust_pointer<'createWritableCallback'>
      | rust_pointer<'createWritableCallbackExclusive'>,
    rust_filesystemhandle: rust_pointer<'filesystemhandle'>,
    error: string,
  ): void;
  get_file_callback(cb: rust_pointer<'getFileCallback'>, file: File): void;
  get_file_callback_error(
    cb: rust_pointer<'getFileCallback'>,
    errpr: string,
  ): void;
};
