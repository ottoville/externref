import { OctaSphere } from "./OctaSphere.js";
import type { Scene } from "../../Scene.js";
import type { Engine } from "../../engine.js";
declare const engine: Engine;

let uid = 0;

export class RoundCuboid extends OctaSphere {

  constructor(
    {label='RoundCuboid' + (uid++), 
    can_collide = false,
    fixed = false,
    width = 0,
    height = 0,
    depth = 0,
    borderRadius = 1,
    scenes
  }: {
      label?:string,
      can_collide?: boolean,
      fixed?:boolean,
      width?:number,
      height?:number,
      depth?:number,
      borderRadius?:number,
      scenes?: Scene[]
    }
  ) {
    super(label, can_collide, fixed, width/borderRadius, height/borderRadius, depth/borderRadius, scenes)
  }
  override create_collider() {
    const max = Math.max(this.width, this.height, this.depth) * 0.5 + 1;
    const normalizedWidth = this.width / max;
    const normalizedHeight = this.height / max;
    const normalizedDepth = this.depth / max;
    const normalizedRadius = 1 / max;
    return engine.rust.create_cuboid_collider(
      normalizedWidth * this.scale_x * 0.5,
      normalizedHeight * this.scale_y * 0.5,
      normalizedDepth * this.scale_z * 0.5,
      normalizedRadius * this.scale_x, false);

  }
}
