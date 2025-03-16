import { DataNodeProps } from './DataNode.js';
import { MainNodeProps } from 'MainNode.js';
import { IndexedDataNode } from './IndexedDataNode.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export abstract class BoundableNodeIndexed extends IndexedDataNode {
  constructor(
    dataNodeProps: DataNodeProps,
    mainNodeProps: MainNodeProps | number,
    onIndicesChange?: () => void,
  ) {
    super(dataNodeProps, mainNodeProps);
    this.onIndicesChange.push(() => {
      if (onIndicesChange) onIndicesChange();
      engine.rust.rebuild_triangle_planes(this.geometry);
    });
    engine.rust.rebuild_triangle_planes(this.geometry);
  }
}
