import { NavigatorStorageBuckets } from './../StorageBuckets.js';

export const IDBFactoryInterface = {
  open(
    name: string,
    version: number,
    root: Window | NavigatorStorageBuckets,
  ): IDBOpenDBRequest {
    return root.indexedDB.open(name, version);
  },
};
