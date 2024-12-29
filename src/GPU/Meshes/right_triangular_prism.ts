import type { Scene } from '../../Scene.js';
import type { Engine } from '../../engine.js';
import { IndexedSingleColoredMesh } from '../AbstractMeshes/IndexedSingleColoredMesh.js';
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
    super(
      {
        can_collide,
        vertices: geometry,
      },
      {
        label,
        point_light,
        scenes,
      },
    );
    const engine_lock = engine.rust.get_engine();
    this.setColor(engine_lock, color);
    engine.rust.drop_engine_lock(engine_lock);
  }
}
