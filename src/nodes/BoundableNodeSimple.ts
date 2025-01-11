import { type canCollideCharacter, DataNode } from './DataNode.js';
import type { Engine } from '../engine.js';
declare const engine: Engine;

export abstract class BoundableNodeSimple
  extends DataNode
  implements canCollideCharacter
{
  rebuildTrianglePlanes() {
    if (!this.initCollider()) return;
    throw new Error('Todo');
    const engine_lock = engine.rust.get_engine();
    const collider_faces_pointer = engine.rust.collider_faces_pointer(
      engine_lock,
      this.id,
    );
    engine.rust.drop_engine_lock(engine_lock);
    //@ts-expect-error todo
    this.colliderVerticesV4.forEach((position) =>
      this.pushVertice(position, collider_faces_pointer),
    );
    this.buildFaces();
  }
}
