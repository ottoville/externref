import { MainNode } from '../MainNode.js';
import type { Engine } from '../engine.js';
import { Drawable } from '../GPU/Drawables/Drawable.js';
declare const engine: Engine;

class pickInfo {
  buffer = new SharedArrayBuffer(6 * 4);
  point = new Float32Array(this.buffer);
  #distance = new DataView(this.buffer, 3 * 4, 4);
  getDistance() {
    return this.#distance.getFloat32(0, true);
  }
}

export type DataNodeProps = {
  /**
   * Setting true will create collider in rapier
   */
  can_collide?: boolean;
  frontFace?: GPUFrontFace;
};
/*
    TODO: Calculate closeDistance on every collision to take account angle between upVector and collided slope,
    so it is always small enought for gravity to hit on next tick.
*/

export class DataNode extends MainNode {
  override drawable?: Drawable<MainNode> | undefined;
  #props: Readonly<DataNodeProps>;

  //Physic things
  acceleration2: [number, number, number] = [0, 0, 0];
  //Actual velocity that occured last tick
  last_velocity: [number, number, number] = [0, 0, 0];
  last_acceleration: [number, number, number] = [0, 0, 0];
  getSpeedSquaredFromId() {
    const velocity = this.getVelocityFromId();
    return (
      velocity[0]! * velocity[0]! +
      velocity[1]! * velocity[1]! +
      velocity[2]! * velocity[2]!
    );
  }
  //coefficient of friction
  grip = 1;
  get impulse() {
    const ptr = engine.rust.get_impulse_from_id(this.id);
    return new Float32Array(engine.rust.memory.buffer, ptr, 3);
  }
  hasGravity = false;

  onVerticesChangeListeners: Set<() => void> = new Set();
  onVerticesChange() {
    this.onVerticesChangeListeners.forEach((cb) => {
      cb();
    });
  }

  // TODO: collide or uncollide with ANY mesh will change this value, so its lot of broken and does not indicate if mesh is really colliding now.
  colliding_physics = false;
  //Used for character
  colliding_character = false;

  checkCollide(_dt: number, _velocityPerDelta: [number, number, number]): void {
    // TODO: Generic collision check, object shape is not known
  }
  onCollideCharacter(_started: boolean) {}
  readonly pickInfo = new pickInfo();

  get_faces_count() {
    return engine.rust.faces_count(this.id);
  }
  /**
   * Get raw vertices data
   */
  get vertices() {
    return new Float32Array(
      engine.rust.memory.buffer,
      engine.rust.vertices_pointer(this.geometry, false),
      this.vertices_count * this.vertices_stride,
    );
  }
  get vertices_count() {
    return engine.rust.vertices_count(this.geometry);
  }
  get have_vertices() {
    return engine.rust.have_vertices(this.id);
  }
  /**
   * stride as DWORD in vertices vec
   */
  get vertices_stride(): Word<'dword'> {
    return engine.rust.vertices_stride(this.geometry);
  }
  /**
   * Update existing vertices
   * @param cb Callback which gets the vertices array as argument
   */
  update_vertices(cb: (view: Float32Array) => void) {
    const view = new Float32Array(
      engine.rust.memory.buffer,
      engine.rust.vertices_pointer(this.geometry, true),
      this.vertices_count * this.vertices_stride,
    );
    cb(view);
    this.onVerticesChange();
  }
  calculate_normals() {
    engine.rust.calculate_normals(this.id);
  }
  dedup_positions() {
    engine.rust.dedup_positions(this.geometry);
  }
  override update_scale(x: number, y: number, z: number): void {
    super.update_scale(x, y, z);
    if (this.#props.can_collide) {
      const collider_ptr = this.create_collider();
      engine.rust.add_collider(this.id, collider_ptr);
    }
  }
  create_collider() {
    return engine.rust.create_trimesh_collider(this.id);
  }
  frontFace: GPUFrontFace;
  geometry: rust_pointer<'geometry'>;
  constructor(props: DataNodeProps, mesh_pointer: rust_pointer<'mesh_id'>) {
    super(mesh_pointer);
    this.#props = Object.freeze(props);

    const { can_collide = false, frontFace = 'cw' } = props;

    this.frontFace = frontFace;

    this.geometry = engine.rust.get_geometry(this.id);

    if (can_collide) {
      const collider_ptr = this.create_collider();
      engine.rust.add_collider(this.id, collider_ptr);
    }
  }
  get verticesArray() {
    const arr: Float32Array[] = [];
    const vertices_pointer = engine.rust.vertices_pointer(this.geometry, false);
    for (let i = 0; i < this.vertices_count; i++) {
      arr.push(
        new Float32Array(
          engine.rust.memory.buffer,
          vertices_pointer +
            i * Float32Array.BYTES_PER_ELEMENT * this.vertices_stride,
          this.vertices_stride,
        ),
      );
    }
    return arr;
  }
  override destroy() {
    let idx = engine.physics.tickables.indexOf(this);
    // TODO: save index to property
    if (idx >= 0) {
      engine.physics.tickables.splice(idx, 1);
    }
    idx = engine.physics.movables.indexOf(this);
    if (idx >= 0) {
      engine.physics.movables.splice(idx, 1);
    }
    super.destroy();
  }
}
