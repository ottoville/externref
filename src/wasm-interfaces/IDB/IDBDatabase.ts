import type { Engine } from '../../engine.js';
declare const engine: Engine;
export const IDBDatabaseInterface = {
  close(database: IDBDatabase) {
    database.close();
  },
  create_object_store(
    database: IDBDatabase,
    name: number,
    autoIncrement: boolean,
  ): IDBObjectStore {
    return database.createObjectStore(name.toString(), {
      autoIncrement,
    });
  },
  on_abort(database: IDBDatabase, cb: rust_pointer<'IDBErrorEvent'>) {
    database.onabort = function (e) {
      engine.rust.idb_database_transaction_onerror_or_abort(
        cb,
        (<IDBRequest>e.target).error!.message ?? '',
      );
    };
  },
  on_close(database: IDBDatabase, cb: rust_pointer<'IDBDBCloseEvent'>) {
    database.onclose = function (_e) {
      engine.rust.idb_database_onclose(cb);
    };
  },
  on_error(database: IDBDatabase, cb: rust_pointer<'IDBErrorEvent'>) {
    database.onerror = function (e) {
      engine.rust.idb_database_transaction_onerror_or_abort(
        cb,
        (<IDBRequest>e.target).error!.message,
      );
    };
  },
  on_version_change(
    database: IDBDatabase,
    cb: rust_pointer<'IDBVersionChangeEvent'>,
  ) {
    database.onversionchange = function (e) {
      engine.rust.idb_database_version_change(cb, e);
    };
  },
  transaction(
    database: IDBDatabase,
    storageNames: string[],
    write: boolean,
    strict: boolean,
    error_cb: rust_pointer<'IDBErrorEvent'>,
    abort_cb: rust_pointer<'IDBAbortEvent'>,
    complete_cb: rust_pointer<'IDBCompleteEvent'>,
  ): IDBTransaction {
    engine.DB = database;
    const transaction = database.transaction(
      storageNames,
      write ? 'readwrite' : 'readonly',
      {
        durability: strict ? 'strict' : 'relaxed',
      },
    );
    transaction.onerror = function (e) {
      engine.rust.idb_transaction_on_error(
        error_cb,
        (e.target as IDBRequest).error!.message,
        e,
      );
    };
    transaction.onabort = function (e) {
      engine.rust.idb_transaction_on_abort(
        abort_cb,
        this.error?.message ?? '',
        e,
      );
    };
    transaction.oncomplete = function (e) {
      engine.rust.idb_transaction_on_complete(complete_cb, e);
    };
    return transaction;
  },
};
