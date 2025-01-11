import { OctaSphere, type OctaSphereProps } from './OctaSphere.js';
import type { Engine } from '../../engine.js';
import type { MainNodeProps } from 'MainNode.js';
declare const engine: Engine;

let uid = 0;

export class RoundCuboid extends OctaSphere {
  constructor(
    { width = 0, height = 0, depth = 0 }: OctaSphereProps,
    {
      can_collide = false,
      borderRadius = 1,
    }: {
      can_collide?: boolean;
      borderRadius?: number;
    },
    mainNodeProps: Partial<MainNodeProps>,
  ) {
    super(
      {
        depth: depth / borderRadius,
        height: height / borderRadius,
        width: width / borderRadius,
      },
      {
        label: 'RoundCuboid' + uid++,
        ...mainNodeProps,
      },
      can_collide,
    );
  }
  override create_collider() {
    const max = Math.max(this.width, this.height, this.depth) * 0.5 + 1;
    const normalizedWidth = this.width / max;
    const normalizedHeight = this.height / max;
    const normalizedDepth = this.depth / max;
    const normalizedRadius = 1 / max;
    const engine_lock = engine.rust.get_engine();
    const scaleZ = this.getScaleZ(engine_lock);
    engine.rust.drop_engine_lock(engine_lock);
    return engine.rust.create_cuboid_collider(
      normalizedWidth * this.scale_x * 0.5,
      normalizedHeight * this.scale_y * 0.5,
      normalizedDepth * scaleZ * 0.5,
      normalizedRadius * this.scale_x,
      false,
    );
  }
}
