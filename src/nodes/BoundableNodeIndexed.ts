import { DataNodeProps } from './DataNode.js';
import { MainNodeProps } from 'MainNode.js';
import { IndexedDataNode } from './IndexedDataNode.js';

export abstract class BoundableNodeIndexed extends IndexedDataNode {
  constructor(
    dataNodeProps: DataNodeProps,
    mainNodeProps: MainNodeProps | rust_pointer<'mesh_id'>,
    onIndicesChange?: () => void,
  ) {
    super(dataNodeProps, mainNodeProps);
    this.onIndicesChange.push(() => {
      if (onIndicesChange) onIndicesChange();
    });
  }
}
