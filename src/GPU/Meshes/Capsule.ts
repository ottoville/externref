import { MeshProperties, OctaSphere } from './OctaSphere.js';
import type { Engine } from '../../engine.js';
declare const engine: Engine;

let uid = 0;
export const enum CAPSULE_ORIENTATION {
  x,
  y,
  z,
}
export class Capsule extends OctaSphere {
  constructor(
    can_collide = false,
    orientation: CAPSULE_ORIENTATION,
    length: number,
    meshProperties: MeshProperties,
  ) {
    super(
      {
        depth: orientation === CAPSULE_ORIENTATION.z ? length : 0,
        height: orientation === CAPSULE_ORIENTATION.y ? length : 0,
        width: orientation === CAPSULE_ORIENTATION.x ? length : 0,
      },
      {
        fixed: false,
        label: 'Capsule' + uid++,
        ...meshProperties,
      },
      can_collide,
    );
  }
  override create_collider() {
    if (this.height > 0 && this.width === 0 && this.depth === 0) {
      const radius = this.scale_x / (this.height + 1);
      return engine.rust.create_capsule_collider(
        this.scale_y - radius,
        radius,
        CAPSULE_ORIENTATION.x,
        false,
      );
    } else if (this.height === 0 && this.width > 0 && this.depth === 0) {
      const radius = this.scale_x / (this.width + 1);
      return engine.rust.create_capsule_collider(
        this.scale_y - radius,
        radius,
        CAPSULE_ORIENTATION.y,
        false,
      );
    } else {
      const radius = this.scale_x / (this.depth + 1);
      return engine.rust.create_capsule_collider(
        this.scale_y - radius,
        radius,
        CAPSULE_ORIENTATION.z,
        false,
      );
    }
  }
  /**
   * Scale whole mesh by setting radius
   */
  set radius(radius: number) {
    this.update_scale(radius, radius, radius);
    const collider_ptr = this.create_collider();
    engine.rust.add_collider(this.id, collider_ptr);
  }
}
