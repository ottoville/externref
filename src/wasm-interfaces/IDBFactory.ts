const textDecoder = new TextDecoder();
import type { Engine } from '../engine.js';
import { NavigatorStorageBuckets } from './StorageBuckets.js';
declare const engine: Engine;

export const IDBFactoryInterface = {
  open(name_ptr: number, name_len: number, version: number): IDBOpenDBRequest {
    const name = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, name_ptr, name_len),
    );
    const request = indexedDB.open(name, version);
    return request;
  },
  open_with_storage_bucket(
    name_ptr: number,
    name_len: number,
    version: number,
    storageBucket: NavigatorStorageBuckets,
  ): IDBOpenDBRequest {
    const name = textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, name_ptr, name_len),
    );
    const request = storageBucket.indexedDB.open(name, version);
    return request;
  },
};
