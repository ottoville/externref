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
    const engine_lock = engine.rust.get_engine();

    const collider_faces_pointer = engine.rust.collider_faces_pointer(
      engine_lock,
      this.id,
    );
    engine.rust.drop_engine_lock(engine_lock);
    this.indices.forEach((indice: number) => {
      const position = this.colliderVerticesV4[indice];
      if (typeof position === 'undefined') {
        throw new Error('position ' + indice + ' not found');
      }

      this.pushVertice(position, collider_faces_pointer);
    });
    this.buildFaces();
  }
}
