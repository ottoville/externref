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
