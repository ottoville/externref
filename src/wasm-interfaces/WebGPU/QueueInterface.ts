import { type Rust_Iterator, rust_iterator_to_js } from '../../utils.js';
import type { Engine } from '../../engine.js';
declare const engine: Engine;

export const QueueInterface = {
  submit(queue: GPUQueue, iterator: Rust_Iterator<GPUCommandBuffer>): void {
    const buffersIterator = rust_iterator_to_js(
      iterator,
      null,
      engine.rust.drain_command_buffers,
    );
    queue.submit(buffersIterator);
  },
  write_buffer(
    queue: GPUQueue,
    destination: GPUBuffer,
    sourceOffset: GPUSize64,
    copySize: GPUSize64,
    destinationOffset: GPUSize64,
  ) {
    queue.writeBuffer(
      destination,
      destinationOffset,
      engine.rust.memory.buffer,
      sourceOffset,
      copySize,
    );
  },
};
