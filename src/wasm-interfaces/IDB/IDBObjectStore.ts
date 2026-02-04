import type { Engine } from '../../engine.js';
declare const engine: Engine;
const textDecoder = new TextDecoder();

export const IDBObjectStoreInterface = {
  create_index(
    objectStore: IDBObjectStore,
    name_ptr: number,
    name_len: number,
    keyPath: string[],
    multiEntry: boolean,
    unique: boolean,
  ): IDBIndex {
    return objectStore.createIndex(
      textDecoder.decode(
        new Uint8Array(engine.rust.memory.buffer, name_ptr, name_len),
      ),
      keyPath,
      {
        multiEntry,
        unique,
      },
    );
  },
  get(
    objectStore: IDBObjectStore,
    key_ptr: number,
    key_len: number,
  ): IDBRequest<unknown> {
    return objectStore.get(
      textDecoder.decode(
        new Uint8Array(engine.rust.memory.buffer, key_ptr, key_len),
      ),
    );
  },
  get_with_array_key(
    objectStore: IDBObjectStore,
    keyPath: string[],
  ): IDBRequest<unknown> {
    return objectStore.get(keyPath);
  },
  get_with_number(
    objectStore: IDBObjectStore,
    key: number,
  ): IDBRequest<unknown> {
    return objectStore.get(key);
  },
  put(
    objectStore: IDBObjectStore,
    ptr: number,
    byte_len: number,
  ): IDBRequest<IDBValidKey> {
    return objectStore.put(engine.rust.memory.buffer.slice(ptr, byte_len));
  },
  put_with_array_key(
    objectStore: IDBObjectStore,
    ptr: number,
    byte_len: number,
    key: string[],
  ): IDBRequest<IDBValidKey> {
    return objectStore.put(
      engine.rust.memory.buffer.slice(ptr, ptr + byte_len),
      key,
    );
  },
  put_with_key(
    objectStore: IDBObjectStore,
    ptr: number,
    byte_len: number,
    key_ptr: number,
    key_len: number,
  ): IDBRequest<IDBValidKey> {
    return objectStore.put(
      engine.rust.memory.buffer.slice(ptr, byte_len),
      textDecoder.decode(
        new Uint8Array(engine.rust.memory.buffer, key_ptr, key_len),
      ),
    );
  },
  set_get_value(ptr: number, value: ArrayBuffer) {
    new Uint8Array(engine.rust.memory.buffer, ptr, value.byteLength).set(
      new Uint8Array(value),
    );
  },
};
