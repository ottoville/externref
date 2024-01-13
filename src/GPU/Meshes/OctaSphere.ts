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
    const ptrs = engine.rust.create_octasphere(2, width, height, depth);
    const [pos_ptr, pos_len, pos_cap, ind_ptr, ind_len, ind_cap] =
      new Uint32Array(engine.rust.memory.buffer, ptrs, 6);

    const vertices = new Float32Array(
      engine.rust.memory.buffer,
      pos_ptr,
      pos_len!,
    );
    for (let i = 0; i < vertices.length; i += 12) {
      vertices[i + 8] = Math.random();
      vertices[i + 9] = Math.random();
      vertices[i + 10] = Math.random();
    }
    super(
      {
        can_collide,
        frontFace: 'ccw',
        vertices: {
          stride: 12 as Word<'dword'>,
          view: [pos_ptr as rust_pointer<'f32'>, pos_len!, pos_cap!], // Must do *2*4 because data is Vec<[Vec3F32; 2]> while expected type is Vec<f32>,
        },
      },
      {
        fixed: false,
        label: 'OctaSphere' + uid++,
        ...meshProperties,
      },
      [ind_ptr as rust_pointer<'usize'>, ind_len!, ind_cap!],
    );

    this.width = width;
    this.height = height;
    this.depth = depth;
  }
}
