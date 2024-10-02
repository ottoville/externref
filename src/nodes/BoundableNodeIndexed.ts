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
    mainNodeProps: MainNodeProps,
    strip = false,
    onIndicesChange?: () => void,
  ) {
    super(dataNodeProps, mainNodeProps, strip);
    this.onIndicesChange.push(() => {
      if (onIndicesChange) onIndicesChange();
      this.rebuildTrianglePlanes();
    });
    this.rebuildTrianglePlanes();
  }
  rebuildTrianglePlanes() {
    if (
      !this.initCollider() ||
      !this
        .indices_count /* This function is called from super constructor when indices are not initialized yet */
    )
      return;
    this.indices.forEach((indice: number) => {
      const position = this.colliderVerticesV4[indice];
      if (typeof position === 'undefined') {
        throw new Error('position ' + indice + ' not found');
      }
      this.pushVertice(position);
    });
    this.buildFaces();
  }
}
