import type { Engine } from './engine.js';
declare const engine: Engine;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function create_rust_label(label: string) {
  const vec_ptr = engine.rust.alloc_vector_u8(label.length);
  const [string_ptr, len, cap] = new Uint32Array(
    engine.rust.memory.buffer,
    vec_ptr,
    3,
  );
  textEncoder.encodeInto(
    label,
    new Uint8Array(engine.rust.memory.buffer, string_ptr, len),
  );
  return [string_ptr!, len!, cap!] as const;
}
export function stringFromPtr(
  memory: WebAssembly.ExportValue | undefined,
  ptr: number,
) {
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error('Webassembly module does not have memory');
  }
  const [s_ptr, len] = new Uint32Array(memory.buffer, ptr, 2);
  return textDecoder.decode(new Uint8Array(memory.buffer, s_ptr, len));
}
