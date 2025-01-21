import type { MainNodeProps } from 'MainNode.js';
import type { Engine } from '../../engine.js';
import { IndexedSingleColoredMesh } from '../AbstractMeshes/IndexedSingleColoredMesh.js';
declare const engine: Engine;

let uid = 0;
export class Box extends IndexedSingleColoredMesh {
  override create_collider() {
    const scaleZ = this.getScaleZ();

    //TODO do not automaticly set collision events
    return engine.rust.create_cuboid_collider(
      this.scale_x,
      this.scale_y,
      scaleZ,
      0,
      true,
    );
  }
  constructor(
    {
      can_collide = false,
      color = [1, 0, 0, 0],
    }: {
      can_collide?: boolean;
      color?: [number, number, number, number];
    },
    mainNodeProps: Partial<MainNodeProps> | number,
  ) {
    const geometry = engine.rust.create_box_geometry();
    super(
      {
        can_collide,
        vertices: geometry,
      },
      typeof mainNodeProps === 'number'
        ? mainNodeProps
        : {
            label: 'box' + uid++,
            ...mainNodeProps,
          },
    );
    this.setColorFromId(color);
  }
}
