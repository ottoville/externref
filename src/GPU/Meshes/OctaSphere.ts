import { RigidBody, type MainNodeProps } from 'MainNode.js';
import type { Engine } from '../../engine.js';
import { IndexedColoredMesh } from '../AbstractMeshes/IndexedColoredMesh.js';
import { create_rust_label } from '../../utils.js';
declare const engine: Engine;

export type OctaSphereProps = {
  width?: number;
  height?: number;
  depth?: number;
};
let uid = 0;
export class OctaSphere extends IndexedColoredMesh {
  protected width: number;
  protected height: number;
  protected depth: number;

  constructor(
    { width = 0, height = 0, depth = 0 }: OctaSphereProps,
    mainNodeProps: Partial<MainNodeProps>,
    can_collide = false,
  ) {
    const geometry = engine.rust.create_octasphere(2, width, height, depth);
    const vertices = new Float32Array(
      engine.rust.memory.buffer,
      engine.rust.vertices_pointer(geometry, false),
      engine.rust.vertices_count(geometry) * 12,
    );
    for (let i = 0; i < vertices.length; i += 12) {
      vertices[i + 8] = Math.random();
      vertices[i + 9] = Math.random();
      vertices[i + 10] = Math.random();
    }
    const {
      point_light = 0,
      directional_light = 0,
      label,
      scenes,
      rigid_body = RigidBody.default,
      camera_can_collide_to = false,
    } = mainNodeProps;
    const sceneids = scenes
      ? scenes.reduce((acc, scene) => acc | scene.id, 0)
      : 1;
    const mesh = engine.rust.new_mesh_from_js(
      point_light,
      directional_light,
      sceneids,
      rigid_body,
      ...create_rust_label(label || 'OctaSphere' + uid++),
      camera_can_collide_to,
    );
    engine.rust.set_geometry(mesh, geometry);

    super(
      {
        can_collide,
      },
      mesh,
    );

    this.width = width;
    this.height = height;
    this.depth = depth;
  }
}
