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
 * Pointer to array with ptr and len
 */
type rust_array_ptr<T> = readonly [ptr: rust_pointer<T>, len: number];

type rust_mutex<L extends 'locked' | 'unlocked', T> = {
  __lock_status: L;
} & rust_pointer<T>;
