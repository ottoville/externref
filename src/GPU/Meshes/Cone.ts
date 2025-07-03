import { create_rust_label } from '../../utils.js';
import type { Engine } from '../../engine.js';
import { MainNodeProps, RigidBody } from '../../MainNode.js';
import { IndexedSingleColoredMesh } from '../AbstractMeshes/IndexedSingleColoredMesh.js';
declare const engine: Engine;

export class Cone extends IndexedSingleColoredMesh {
  constructor(
    mainNodeProps: Omit<MainNodeProps, 'strip'>,
    can_collide = false,
    color: [number, number, number, number] = [1, 0, 0, 0],
  ) {
    const geometry = engine.rust.create_cone_geometry(14);
    const {
      point_light = 0,
      directional_light = 0,
      label,
      scenes,
      rigid_body = RigidBody.default,
      camera_can_collide_to,
    } = mainNodeProps;

    const sceneids = scenes
      ? scenes.reduce((acc, scene) => acc | scene.id, 0)
      : 1;

    const mesh = engine.rust.new_mesh_from_js(
      point_light,
      directional_light,
      sceneids,
      rigid_body,
      ...create_rust_label(label),
      camera_can_collide_to,
    );
    engine.rust.set_geometry(mesh, geometry);
    super(
      {
        can_collide,
        frontFace: 'ccw',
      },
      mesh,
    );
    this.setColorFromId(color);
  }
  override create_collider() {
    return engine.rust.create_cone_collider(this.scale_y, this.radius);
  }
  get radius() {
    return this.scale_x;
  }
  set radius(radius: number) {
    this.update_scale(radius, this.scale_y, radius);
    const collider_ptr = engine.rust.create_cone_collider(this.scale_y, radius);
    engine.rust.add_collider(this.id, collider_ptr);
  }
}
