import type { Engine } from '../engine.js';
declare const engine: Engine;

export const IDBOpenDBRequestInterface = {
  onblocked(
    request: IDBOpenDBRequest,
    cb: rust_pointer<'IDBVersionChangeEvent'>,
  ) {
    request.onblocked = function (evt) {
      engine.rust.idb_on_blocked(cb, evt.oldVersion, evt.newVersion);
    };
  },
  onupgradeneeded(
    request: IDBOpenDBRequest,
    cb: rust_pointer<'IDBVersionChangeEvent'>,
  ) {
    request.onupgradeneeded = function (evt) {
      console.log('onupgradeneeded from JS');
      engine.rust.idb_upgrade_needed(
        cb,
        this.result,
        evt.oldVersion,
        evt.newVersion,
      );
    };
  },
};
