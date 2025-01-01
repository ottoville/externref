import type { Engine } from '../../engine.js';
import { MainNodeProps } from '../../MainNode.js';
import { IndexedSingleColoredMesh } from '../AbstractMeshes/IndexedSingleColoredMesh.js';
declare const engine: Engine;

export class Cone extends IndexedSingleColoredMesh {
  constructor(
    mainNodeProps: Omit<MainNodeProps, 'strip'>,
    can_collide = false,
    color: [number, number, number, number] = [1, 0, 0, 0],
  ) {
    const geometry = engine.rust.create_cone_geometry(14);
    super(
      {
        can_collide,
        frontFace: 'ccw',
        vertices: geometry,
      },
      mainNodeProps,
    );
    const engine_lock = engine.rust.get_engine();
    this.setColorFromMutex(engine_lock, color);
    engine.rust.drop_engine_lock(engine_lock);
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
