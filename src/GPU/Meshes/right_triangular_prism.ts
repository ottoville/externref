import { create_rust_label } from '../../utils.js';
import type { Scene } from '../../Scene.js';
import type { Engine } from '../../engine.js';
import { IndexedSingleColoredMesh } from '../AbstractMeshes/IndexedSingleColoredMesh.js';
import { RigidBody } from 'MainNode.js';
declare const engine: Engine;

let uid = 0;
export class RightTriangularPrism extends IndexedSingleColoredMesh {
  override create_collider() {
    //TODO do not automaticly set collision events
    return engine.rust.create_convex_collider(this.id, true);
  }
  constructor({
    scenes,
    point_light = 0,
    can_collide = false,
    label = 'TriangularPrism' + uid++,
    color = [1, 0, 0, 0],
  }: {
    scenes?: Scene[];
    point_light?: number;
    can_collide?: boolean;
    label?: string;
    color?: [number, number, number, number];
  }) {
    const geometry = engine.rust.create_rtp_geometry();
    const mesh = engine.rust.new_mesh_from_js(
      point_light,
      0,
      scenes ? scenes.reduce((acc, scene) => acc | scene.id, 0) : 1,
      RigidBody.off,
      ...create_rust_label(label),
      false,
    );
    engine.rust.set_geometry(mesh, geometry);

    super(
      {
        can_collide,
      },
      mesh,
    );
    this.setColorFromId(color);
  }
}
