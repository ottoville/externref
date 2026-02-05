import { DataNode } from './DataNode.js';
import { DrawableIndexed } from '../GPU/Drawables/DrawableIndexed.js';
import { RenderPipelineProps } from 'GPU/RenderPipeline.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export class IndexedDataNode extends DataNode {
  declare drawable?:
    | DrawableIndexed<RenderPipelineProps, IndexedDataNode>
    | undefined;
  get indices() {
    return new Uint32Array(
      engine.rust.memory.buffer,
      engine.rust.indices_field_pointer(this.geometry),
      engine.rust.indices_lenght(this.geometry),
    );
  }
  get indices_count() {
    return engine.rust.indices_lenght(this.geometry);
  }
}
