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
export type IDBTransactionImports = {
  idb_transaction_on_error(
    cb: rust_pointer<'IDBErrorEvent'>,
    error: string,
    event: Event,
  ): void;
  idb_transaction_on_abort(
    cb: rust_pointer<'IDBAbortEvent'>,
    error: string,
    event: Event,
  ): void;
  idb_transaction_on_complete(
    cb: rust_pointer<'IDBCompleteEvent'>,
    event: Event,
  ): void;
};
