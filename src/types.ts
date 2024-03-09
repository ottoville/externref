/**
 * Unit for specific word size
 */
type Word<T extends 'word' | 'dword' | 'qword'> = {
  __word: T;
} & number;

/**
 * Pointer to memory used by rust
 */
type rust_pointer<T> = {
  __brand: T;
} & Word<'dword'>;

/**
 * Pointer to vector with ptr, len and cap
 */
type rust_array_ptr<T> = readonly [ptr: rust_pointer<T>, len: number];

/**
 * Pointer to vector with ptr, len and cap
 */
type rust_vec_ptr<T> = readonly [...rust_array_ptr<T>, cap: number];
