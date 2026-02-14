import type { Engine } from '../../engine.js';
declare const engine: Engine;

export const IDBRequestInterface = {
  onerror(request: IDBRequest, cb: rust_pointer<'IDBErrorEvent'>) {
    request.onerror = function (e) {
      engine.rust.idb_request_onerror(cb, this.error!.message, e);
    };
  },
  onsuccess(request: IDBRequest, cb: rust_pointer<'IDBSuccessEvent'>) {
    request.onsuccess = function (e) {
      if (typeof this.result === 'undefined') {
        engine.rust.idb_request_onsuccess_undefined_result(cb, e);
      } else if (
        typeof this.result === 'number' &&
        this.source instanceof IDBObjectStore &&
        this.source.autoIncrement
      ) {
        engine.rust.idb_request_onsuccess_put(cb, this.result, e);
      } else {
        engine.rust.idb_request_onsuccess(cb, this.result, e);
      }
    };
  },
};
export type IDBRequestImports = {
  idb_request_onerror(
    cb: rust_pointer<'IDBErrorEvent'>,
    error: string,
    event: Event,
  ): void;
  idb_request_onsuccess(
    cb: rust_pointer<'IDBSuccessEvent'>,
    result: unknown,
    event: Event,
  ): void;
  idb_request_onsuccess_put(
    cb: rust_pointer<'IDBSuccessEvent'>,
    result: number,
    event: Event,
  ): void;
  idb_request_onsuccess_undefined_result(
    cb: rust_pointer<'IDBSuccessEvent'>,
    event: Event,
  ): void;
};
