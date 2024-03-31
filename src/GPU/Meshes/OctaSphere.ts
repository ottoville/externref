import { create_rust_vec_ptr } from '../../Math.js';
import type { Scene } from '../../Scene.js';
import type { Engine } from '../../engine.js';
import { IndexedColoredMesh } from '../AbstractMeshes/IndexedColoredMesh.js';
declare const engine: Engine;

export type OctaSphereProps = {
  width?: number;
  height?: number;
  depth?: number;
};
export type MeshProperties = {
  label?: string;
  fixed?: boolean;
  scenes?: Scene[] | undefined;
};
let uid = 0;
export class OctaSphere extends IndexedColoredMesh {
  protected width: number;
  protected height: number;
  protected depth: number;

  constructor(
    { width = 0, height = 0, depth = 0 }: OctaSphereProps,
    meshProperties: MeshProperties,
    can_collide = false,
  ) {
    const geometry = engine.rust.create_octasphere(2, width, height, depth);
    const vertices = new Float32Array(
      engine.rust.memory.buffer,
      engine.rust.vertices_pointer(geometry),
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
        fixed: false,
        label: 'OctaSphere' + uid++,
        ...meshProperties,
      },
      create_rust_vec_ptr(engine.rust.indices_field_pointer(geometry)),
    );

    this.width = width;
    this.height = height;
    this.depth = depth;
  }
}
