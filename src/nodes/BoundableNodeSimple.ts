import { MainNodeProps } from 'MainNode.js';
import {
  type canCollideCharacter,
  DataNode,
  DataNodeProps,
} from './DataNode.js';

export abstract class BoundableNodeSimple
  extends DataNode
  implements canCollideCharacter
{
  constructor(
    dataNodeProps: DataNodeProps,
    mainNodeProps: MainNodeProps,
    strip = false,
  ) {
    super(dataNodeProps, mainNodeProps, strip);
  }
  rebuildTrianglePlanes() {
    if (!this.initCollider()) return;
    this.colliderVerticesV4.forEach(this.pushVertice);
    this.buildFaces();
  }
}
