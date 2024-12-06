import { type Rust_Iterator, rust_iterator_to_js } from '../utils.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export const QueueInterface = {
  submit(queue: GPUQueue, iterator: Rust_Iterator<GPUCommandBuffer>): void {
    const buffersIterator = rust_iterator_to_js(
      iterator,
      engine.rust.drain_command_buffers,
    );
    queue.submit(buffersIterator);
  },
};
