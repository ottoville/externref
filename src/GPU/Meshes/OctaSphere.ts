import type { MainNodeProps } from 'MainNode.js';
import type { Engine } from '../../engine.js';
import { IndexedColoredMesh } from '../AbstractMeshes/IndexedColoredMesh.js';
declare const engine: Engine;

export type OctaSphereProps = {
  width?: number;
  height?: number;
  depth?: number;
};
let uid = 0;
export class OctaSphere extends IndexedColoredMesh {
  protected width: number;
  protected height: number;
  protected depth: number;

  constructor(
    { width = 0, height = 0, depth = 0 }: OctaSphereProps,
    mainNodeProps: Partial<MainNodeProps>,
    can_collide = false,
  ) {
    const geometry = engine.rust.create_octasphere(2, width, height, depth);
    const vertices = new Float32Array(
      engine.rust.memory.buffer,
      engine.rust.vertices_pointer(geometry, false),
      engine.rust.vertices_count(geometry) * 12,
    );
    for (let i = 0; i < vertices.length; i += 12) {
      vertices[i + 8] = Math.random();
      vertices[i + 9] = Math.random();
      vertices[i + 10] = Math.random();
    }
    super(
      {
        can_collide,
        vertices: geometry,
      },
      {
        label: 'OctaSphere' + uid++,
        ...mainNodeProps,
      },
    );

    this.width = width;
    this.height = height;
    this.depth = depth;
  }
}
