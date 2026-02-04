import type { Engine } from '../../engine.js';
declare const engine: Engine;

export const IDBTransactionInterface = {
  object_store(
    transaction: IDBTransaction,
    objectStore: number,
  ): IDBObjectStore {
    return transaction.objectStore(objectStore.toString());
  },
};
