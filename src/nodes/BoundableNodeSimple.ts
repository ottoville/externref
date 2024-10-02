import { type canCollideCharacter, DataNode } from './DataNode.js';

export abstract class BoundableNodeSimple
  extends DataNode
  implements canCollideCharacter
{
  rebuildTrianglePlanes() {
    if (!this.initCollider()) return;
    this.colliderVerticesV4.forEach(this.pushVertice);
    this.buildFaces();
  }
}
