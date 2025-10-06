import type { Scene } from '../../Scene.js';
import type { Engine } from '../../engine.js';
import { IndexedSingleColoredMesh } from '../AbstractMeshes/IndexedSingleColoredMesh.js';
import { RigidBody } from 'MainNode.js';
declare const engine: Engine;

export class RightTriangularPrism extends IndexedSingleColoredMesh {
  override create_collider() {
    //TODO do not automaticly set collision events
    return engine.rust.create_convex_collider(this.id, true);
  }
  constructor({
    scenes,
    point_light = 0,
    can_collide = false,
    color = [1, 0, 0, 0],
  }: {
    scenes?: Scene[];
    point_light?: number;
    can_collide?: boolean;
    label?: string;
    color?: [number, number, number, number];
  }) {
    const mesh = engine.rust.create_rtp_mesh(
      point_light,
      0,
      scenes ? scenes.reduce((acc, scene) => acc | scene.id, 0) : 1,
      RigidBody.off,
      false,
      engine.gpu!.gpu,
    );

    super(
      {
        can_collide,
      },
      mesh,
    );
    this.setColorFromId(color);
  }
}
