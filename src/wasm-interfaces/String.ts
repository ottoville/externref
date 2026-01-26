import { Engine } from '../engine.js';
declare const engine: Engine;
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

export const StringInterface = {
  create_string(s_ptr: number, len: number): string {
    return textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, s_ptr, len),
    );
  },
  from_externref(externref: string, ptr: number, len: number) {
    textEncoder.encodeInto(
      externref,
      new Uint8Array(engine.rust.memory.buffer, ptr, len),
    );
  },
};
