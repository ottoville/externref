import { MainNodeProps } from 'MainNode.js';
import type { rust_vec_ptr } from '../engine.js';
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
    super(dataNodeProps, mainNodeProps, undefined, strip);
  }
  override set_vertices(vec: rust_vec_ptr<'f32'>, stride: Word<'dword'>) {
    super.set_vertices(vec, stride);
    this.rebuildTrianglePlanes();
  }
  rebuildTrianglePlanes() {
    if (!this.initCollider()) return;
    this.colliderVerticesV4.forEach(this.pushVertice);
    this.buildFaces();
  }
}
