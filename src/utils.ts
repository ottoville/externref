import type { Engine } from './engine.js';
declare const engine: Engine;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function create_rust_string(label: string) {
  const vec = create_rust_vec_ptr(engine.rust.alloc_vector_u8(label.length));
  textEncoder.encodeInto(
    label,
    new Uint8Array(engine.rust.memory.buffer, vec[0], vec[1]),
  );
  return vec;
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
export function create_rust_vec_ptr<T>(ptr: rust_pointer<rust_vec_ptr<T>>) {
  return Array.from(
    new Uint32Array(engine.rust.memory.buffer, ptr, 3),
  ) as unknown as rust_vec_ptr<T>;
}

export type Rust_Iterator<T> = rust_pointer<'iterator'> & {
  __iterator_brand: T;
};
export function rust_iterator_to_js<T, E>(
  rust_iterator: Rust_Iterator<T>,
  null_value: E,
  rust_next: (rust_iterator: Rust_Iterator<T>) => T | E,
): Iterable<T> {
  const iterator = {
    next(): IteratorResult<T, E> {
      const item = rust_next(rust_iterator);
      if (item !== null_value) {
        return {
          done: false,
          value: item as T,
        };
      }
      return {
        done: true,
        value: null_value,
      };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
  return iterator;
}
