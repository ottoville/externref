import { type canCollideCharacter, DataNodeProps } from './DataNode.js';
import { MainNodeProps } from 'MainNode.js';
import { IndexedDataNode } from './IndexedDataNode.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export abstract class BoundableNodeIndexed
  extends IndexedDataNode
  implements canCollideCharacter
{
  constructor(
    dataNodeProps: DataNodeProps,
    mainNodeProps: MainNodeProps | number,
    onIndicesChange?: () => void,
  ) {
    super(dataNodeProps, mainNodeProps);
    this.onIndicesChange.push(() => {
      if (onIndicesChange) onIndicesChange();
      if (dataNodeProps.character_can_collide_to) this.rebuildTrianglePlanes();
    });
    if (dataNodeProps.character_can_collide_to) this.rebuildTrianglePlanes();
  }
  rebuildTrianglePlanes() {
    if (
      !this.initCollider() ||
      !this
        .indices_count /* This function is called from super constructor when indices are not initialized yet */
    )
      return;
    engine.rust.rebuild_triangle_planes(this.geometry);
  }
}
