import type { Scene } from '../../Scene.js';
import type { Engine } from '../../engine.js';
import { create_rust_vec_ptr } from '../../Math.js';
import { IndexedSingleColoredMesh } from '../AbstractMeshes/IndexedSingleColoredMesh.js';
import { RigidBody } from 'MainNode.js';
declare const engine: Engine;
let uid = 0;
export class IcoSphere extends IndexedSingleColoredMesh {
  override create_collider() {
    return engine.rust.create_ball_collider(this.scale_x);
  }
  set radius(radius: number) {
    this.update_scale(radius, radius, radius);
    const collider_ptr = engine.rust.create_ball_collider(radius);
    engine.rust.add_collider(this.id, collider_ptr);
  }
  constructor({
    order = 0,
    label = 'sphere' + uid++,
    can_collide = false,
    scenes,
    rigid_body,
  }: {
    order?: number;
    label?: string;
    can_collide?: boolean;
    scenes?: Scene[];
    rigid_body?: RigidBody;
  }) {
    const geometry = engine.rust.create_icosphere_geometry(order);

    super(
      {
        can_collide,
        frontFace: 'ccw',
        vertices: geometry,
      },
      {
        label,
        rigid_body,
        scenes,
      },
      create_rust_vec_ptr(engine.rust.indices_field_pointer(geometry)),
    );
  }
}
