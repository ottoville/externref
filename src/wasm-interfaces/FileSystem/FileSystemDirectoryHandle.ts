import type { Engine } from '../../engine.js';
declare const engine: Engine;

export const FileSystemDirectoryHandleInterface = {
  async entries(
    fileSystemDirectoryHandle: FileSystemDirectoryHandle,
    cb: rust_pointer<'entryCallback'>,
  ) {
    const iterator = fileSystemDirectoryHandle.entries();
    while (true) {
      const entry = await iterator.next();
      if (entry.done) {
        return;
      }
      if (
        engine.rust.entry_iterator_callback(
          cb,
          entry.value[0],
          entry.value[1],
          entry.value[1].kind === 'file',
        )
      ) {
        return;
      }
    }
  },
  get_directory_handle(
    fileSystemDirectoryHandle: FileSystemDirectoryHandle,
    name_ptr: number,
    create: boolean,
    cb: rust_pointer<'getDirectoryCallback'>,
  ) {
    const name = engine.rust.externrefs.get(name_ptr) as string;
    fileSystemDirectoryHandle
      .getDirectoryHandle(name, { create })
      .then((directory) => {
        try {
          engine.rust.get_directory_callback(cb, directory, directory.name);
        } catch (err: unknown) {
          // Catch possible error in rust to avoid exception leaking
          // into outer catch which is reserved only for "getFileHandle" throws.
          console.error(err);
        }
      })
      .catch((err: TypeError | DOMException) => {
        engine.rust.get_directory_callback_error(cb, err.message);
      });
  },
  get_file_handle(
    fileSystemDirectoryHandle: FileSystemDirectoryHandle,
    name_ptr: number,
    create: boolean,
    cb: rust_pointer<'getFileHandleCallback'>,
  ) {
    const name = engine.rust.externrefs.get(name_ptr) as string;
    fileSystemDirectoryHandle
      .getFileHandle(name, { create })
      .then((file) => {
        try {
          engine.rust.get_file_handle_callback(cb, file);
        } catch (err: unknown) {
          // Catch possible error in rust to avoid exception leaking
          // into outer catch which is reserved only for "getFileHandle" throws.
          console.error(err);
        }
      })
      .catch((err: TypeError | DOMException) => {
        engine.rust.get_file_handle_callback_error(cb, err.name);
      });
  },
};

export type FileSystemDirectoryHandleImports = {
  entry_iterator_callback(
    cb: rust_pointer<'entryCallback'>,
    name: string,
    handle: FileSystemHandle,
    isFile: boolean,
  ): boolean;
  entry_iterator_callback_end(cb: rust_pointer<'entryCallback'>): boolean;
  get_directory_callback(
    cb: rust_pointer<'getDirectoryCallback'>,
    directory: FileSystemDirectoryHandle,
    name: string,
  ): void;
  get_directory_callback_error(
    cb: rust_pointer<'getDirectoryCallback'>,
    error: string,
  ): void;
  get_file_handle_callback(
    cb: rust_pointer<'getFileHandleCallback'>,
    file: FileSystemFileHandle,
  ): void;
  get_file_handle_callback_error(
    cb: rust_pointer<'getFileHandleCallback'>,
    error: string,
  ): void;
};
