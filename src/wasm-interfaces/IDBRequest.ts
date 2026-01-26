import { create_rust_string } from '../utils.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export const IDBRequestInterface = {
  onerror(request: IDBRequest, cb: rust_pointer<'IDBErrorEvent'>) {
    request.onerror = function (e) {
      engine.rust.idb_request_onerror(
        cb,
        ...create_rust_string(this.error!.message),
        e,
      );
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
