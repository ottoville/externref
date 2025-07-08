import type { Scene } from '../../Scene.js';
import type { Engine } from '../../engine.js';
import { IndexedSingleColoredMesh } from '../AbstractMeshes/IndexedSingleColoredMesh.js';
import { RigidBody } from '../../MainNode.js';
declare const engine: Engine;
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
    can_collide = false,
    scenes,
    rigid_body = RigidBody.off,
  }: {
    order?: number;
    label?: string;
    can_collide?: boolean;
    scenes?: Scene[];
    rigid_body?: RigidBody;
  }) {
    const mesh = engine.rust.create_icosphere_mesh(
      0,
      0,
      scenes ? scenes.reduce((acc, scene) => acc | scene.id, 0) : 1,
      rigid_body,
      false,
      order,
    );
    super(
      {
        can_collide,
        frontFace: 'ccw',
      },
      mesh,
    );
  }
}
