import type { Engine } from '../../engine.js';
declare const engine: Engine;

export const KeyboardEventInterface = {
  add_keydown_event_listener(cb: rust_pointer<'keyboard_cb'>) {
    document.addEventListener('keydown', function (evt) {
      if (!evt.repeat) engine.rust.on_key_down(cb, evt, evt.ctrlKey, evt.code);
    });
  },
  add_keyup_event_listener(cb: rust_pointer<'keyboard_cb'>) {
    document.addEventListener('keyup', function (evt) {
      engine.rust.on_key_up(cb, evt, evt.ctrlKey, evt.code);
    });
  },
};
export type KeyboardEventImports = {
  keydown(): void;
  on_key_down(
    cb: rust_pointer<'keyboard_cb'>,
    event: KeyboardEvent,
    ctrl_key: boolean,
    code: string,
  ): void;
  on_key_up(
    cb: rust_pointer<'keyboard_cb'>,
    event: KeyboardEvent,
    ctrl_key: boolean,
    code: string,
  ): void;
};
