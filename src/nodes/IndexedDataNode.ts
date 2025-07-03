import { DataNode } from './DataNode.js';
import { DrawableIndexed } from '../GPU/Drawables/DrawableIndexed.js';
import { RenderPipelineProps } from 'GPU/RenderPipeline.js';
import type { Engine } from '../engine.js';
import { create_rust_vec_ptr } from '../utils.js';
declare const engine: Engine;

export class IndexedDataNode extends DataNode {
  declare drawable?:
    | DrawableIndexed<RenderPipelineProps, IndexedDataNode>
    | undefined;
  get indices() {
    const [indices_ptr, indices_len] = create_rust_vec_ptr(
      engine.rust.indices_field_pointer(this.geometry),
    );
    return new Uint32Array(engine.rust.memory.buffer, indices_ptr, indices_len);
  }
  get indices_count() {
    return create_rust_vec_ptr(
      engine.rust.indices_field_pointer(this.geometry),
    )[1];
  }
}
