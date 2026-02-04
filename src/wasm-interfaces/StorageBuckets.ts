import type { Engine } from '../engine.js';
declare const engine: Engine;

export interface NavigatorStorageBuckets extends StorageManager {
  readonly name: string;
  setExpires(expires: DOMHighResTimeStamp): Promise<undefined>;
  expires(): Promise<DOMHighResTimeStamp>;
  readonly indexedDB: IDBFactory;
  readonly caches: CacheStorage;
}
type StorageBucketOptions = {
  persisted: boolean;
  quota: number;
  expires: DOMHighResTimeStamp;
};
declare global {
  interface Navigator {
    storageBuckets: {
      delete(name: string): Promise<undefined>;
      keys(): Iterable<string>;
      open(
        name: string,
        options?: StorageBucketOptions,
      ): Promise<NavigatorStorageBuckets>;
    };
  }
}
export const StorageBucketsInterface = {
  get_directory(
    storageManager: StorageManager,
    cb: rust_pointer<'getDirectoryCallback'>,
  ) {
    storageManager
      .getDirectory()
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
  open(
    name: string,
    persisted: boolean,
    quota: number,
    expires: DOMHighResTimeStamp,
    cb: rust_pointer<'storagebucketopencb'>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises, promise/catch-or-return
    navigator.storageBuckets
      .open(name, {
        expires,
        persisted,
        quota,
      })
      .then((storageBucket) => {
        //@ts-expect-error Chrome have bug that kills the indexeddb connection if storagebucket is GC'd
        if (typeof globalThis.buckets === 'undefined') {
          //@ts-expect-error Chrome have bug that kills the indexeddb connection if storagebucket is GC'd
          globalThis.buckets = [storageBucket];
        } else {
          //@ts-expect-error Chrome have bug that kills the indexeddb connection if storagebucket is GC'd
          globalThis.buckets.push(storageBucket);
        }
        engine.rust.storage_bucket_open(cb, storageBucket);
      });
  },
};
