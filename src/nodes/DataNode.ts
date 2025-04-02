import { MainNode, MainNodeProps } from '../MainNode.js';
import { MutableTerraVector3, ReadOnlyFloat32Array } from '../Math.js';
import type { Engine } from '../engine.js';
import { Drawable } from '../GPU/Drawables/Drawable.js';
import { create_rust_vec_ptr } from '../utils.js';
declare const engine: Engine;

class pickInfo {
  buffer = new SharedArrayBuffer(6 * 4);
  point = new MutableTerraVector3(this.buffer);
  #distance = new DataView(this.buffer, 3 * 4, 4);
  getDistance() {
    return this.#distance.getFloat32(0, true);
  }
}

export type DataNodeProps = {
  vertices: rust_pointer<'geometry'>;
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

export function allocate_vec_f32(length: Word<'dword'>) {
  return create_rust_vec_ptr(engine.rust.alloc_vector_f32(length));
}
export function allocate_vec_positions(length: number) {
  return create_rust_vec_ptr(engine.rust.alloc_vector_positions(length));
}
export function allocate_vec_positions_and_normals(length: number) {
  return create_rust_vec_ptr(
    engine.rust.alloc_vector_positions_and_normal(length),
  );
}
export function allocate_vec_positions_and_normals_and_uv(length: number) {
  return create_rust_vec_ptr(
    engine.rust.alloc_vector_position_and_normal_and_UV(length),
  );
}
export function allocate_vec_positions2d_and_uv(length: number) {
  return create_rust_vec_ptr(
    engine.rust.alloc_vector_positions2d_and_uv(length),
  );
}
export function allocate_vec_usize(length: number) {
  return create_rust_vec_ptr(engine.rust.alloc_vector_usize(length));
}

export function allocate_vec(array: Uint32Array): rust_vec_ptr<'usize'>;
export function allocate_vec(array: Float32Array): rust_vec_ptr<'f32'>;
export function allocate_vec(
  array: Uint32Array | Float32Array,
): readonly [
  ptr: rust_pointer<'usize'> | rust_pointer<'f32'>,
  len: number,
  cap: number,
] {
  if (array.buffer.byteLength === 0) {
    throw new Error('Cannot allocate deattached or empty buffer');
  }
  if (array.buffer === engine.rust.memory.buffer) {
    throw new Error('Source buffer is already in rust');
  }
  if (array instanceof Float32Array) {
    const ptr = allocate_vec_f32(array.length as Word<'dword'>);
    new Float32Array(engine.rust.memory.buffer, ptr[0], ptr[1]).set(array);
    return ptr;
  } else {
    const vec_ptr = create_rust_vec_ptr(
      engine.rust.alloc_vector_usize(array.length),
    );
    new Uint32Array(engine.rust.memory.buffer, vec_ptr[0], vec_ptr[1]).set(
      array,
    );
    return vec_ptr;
  }
}

export class DataNode extends MainNode {
  override drawable?: Drawable<MainNode> | undefined;
  #props: Readonly<DataNodeProps>;

  //Physic things
  acceleration2: [number, number, number] = [0, 0, 0];
  //Actual velocity that occured last tick
  last_velocity: [number, number, number] = [0, 0, 0];
  last_acceleration: [number, number, number] = [0, 0, 0];
  static getSpeedSquared(mesh: rust_pointer<'mesh'>) {
    const velocity = this.getVelocity(mesh);
    return (
      velocity[0] * velocity[0] +
      velocity[1] * velocity[1] +
      velocity[2] * velocity[2]
    );
  }
  getSpeedSquaredFromId() {
    const velocity = this.getVelocityFromId();
    return (
      velocity[0] * velocity[0] +
      velocity[1] * velocity[1] +
      velocity[2] * velocity[2]
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
  set faces(faces: Float32Array) {
    const vec_ptr = create_rust_vec_ptr(
      engine.rust.alloc_vector_f32(faces.length as Word<'dword'>),
    );
    new Float32Array(engine.rust.memory.buffer, vec_ptr[0], vec_ptr[1]).set(
      faces,
    );
    engine.rust.set_faces(this.id, ...vec_ptr);
  }
  /**
   * Get raw vertices data
   */
  get vertices() {
    return new ReadOnlyFloat32Array(
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
  constructor(
    props: DataNodeProps,
    mainNodeProps: MainNodeProps | rust_pointer<'mesh_id'>,
  ) {
    super(mainNodeProps);
    this.#props = Object.freeze(props);

    const { vertices, can_collide = false, frontFace = 'cw' } = props;

    this.frontFace = frontFace;

    if (typeof mainNodeProps !== 'number') {
      this.geometry = engine.rust.set_geometry(this.id, vertices);
    } else {
      this.geometry = engine.rust.get_geometry(this.id);
    }

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
