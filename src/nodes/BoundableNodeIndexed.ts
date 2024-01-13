import type { rust_vec_ptr } from 'engine.js';
import {
  type canCollideCharacter,
  DataNodeProps,
  DataNode,
} from './DataNode.js';
import { MainNodeProps } from 'MainNode.js';

export abstract class BoundableNodeIndexed
  extends DataNode
  implements canCollideCharacter
{
  constructor(
    dataNodeProps: DataNodeProps,
    mainNodeProps: MainNodeProps,
    strip = false,
    indicesView: rust_vec_ptr<'usize'>,
    onIndicesChange?: () => void,
  ) {
    super(dataNodeProps, mainNodeProps, indicesView, strip);
    this.onIndicesChange.push(() => {
      if (onIndicesChange) onIndicesChange();
      this.rebuildTrianglePlanes();
    });
    this.rebuildTrianglePlanes();
  }
  override set_vertices(vertices: rust_vec_ptr<'f32'>, stride: Word<'dword'>) {
    super.set_vertices(vertices, stride);
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
