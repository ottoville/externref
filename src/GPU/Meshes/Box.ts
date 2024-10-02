import type { Scene } from '../../Scene.js';
import type { Engine } from '../../engine.js';
import { IndexedSingleColoredMesh } from '../AbstractMeshes/IndexedSingleColoredMesh.js';
declare const engine: Engine;

let uid = 0;
export class Box extends IndexedSingleColoredMesh {
  override create_collider() {
    //TODO do not automaticly set collision events
    return engine.rust.create_cuboid_collider(
      this.scale_x,
      this.scale_y,
      this.scale_z,
      0,
      true,
    );
  }
  constructor({
    scenes,
    point_light = 0,
    can_collide = false,
    label = 'box' + uid++,
    color = [1, 0, 0, 0],
  }: {
    scenes?: Scene[];
    point_light?: number;
    can_collide?: boolean;
    label?: string;
    color?: [number, number, number, number];
  }) {
    const geometry = engine.rust.create_box_geometry();
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
    this.color = color;
  }
}
