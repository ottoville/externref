import {
  MutableTerraVector3,
  Quaternion,
  ReadOnlyTerraVector3,
  TerraMatrix,
  TerraVector3,
} from './Math.js';
import type { Scene } from './Scene.js';
import type { Engine } from './engine.js';
import type { ColliderJS } from './Collider.js';
import type { Drawable } from './GPU/Drawables/Drawable.js';
import { Destroyable } from 'webgpu-ts/index.js';
import { create_rust_label, stringFromPtr } from './utils.js';
import { Externref } from './externref.js';
declare const engine: Engine;
export const enum RigidBody {
  off,
  default,
  fixed,
}
export type MainNodeProps = {
  point_light?: number;
  directional_light?: number;
  label: string;
  scenes?: Scene[] | undefined;
  rigid_body?: RigidBody | undefined;
};

export abstract class MainNode implements Destroyable {
  abstract drawable?: Drawable | undefined;

  readonly id: number;
  get label(): string {
    const label_field_pointer = engine.rust.label_field_pointer(this.id);
    return stringFromPtr(engine.rust.memory, label_field_pointer);
  }
  setColor(
    engine_lock: rust_pointer<'engine'>,
    data: [number, number, number, number],
  ) {
    engine.rust.set_color(
      engine_lock,
      this.id,
      data[0],
      data[1],
      data[2],
      data[3],
    );
  }
  setColorFromMutex(
    engine_lock: rust_mutex<'locked', 'enginelock'>,
    data: [number, number, number, number],
  ) {
    engine.rust.set_color_from_mutex(
      engine_lock,
      this.id,
      data[0],
      data[1],
      data[2],
      data[3],
    );
  }
  setAmbient(
    engine_lock: rust_pointer<'engine'>,
    data: [r: number, b: number, g: number],
  ) {
    engine.rust.set_ambient(engine_lock, this.id, data[0], data[1], data[2]);
  }
  setAmbientFromMutex(
    engine_lock: rust_mutex<'locked', 'enginelock'>,
    data: [r: number, b: number, g: number],
  ) {
    engine.rust.set_ambient_from_mutex(
      engine_lock,
      this.id,
      data[0],
      data[1],
      data[2],
    );
  }
  setShadow(engine_lock: rust_pointer<'engine'>, shadow: number) {
    engine.rust.set_shadow(engine_lock, this.id, shadow);
  }
  setShadowFromMutex(
    engine_lock: rust_mutex<'locked', 'enginelock'>,
    shadow: number,
  ) {
    engine.rust.set_shadow_from_mutex(engine_lock, this.id, shadow);
  }
  /**
   *
   * @param x Scale for x dimension
   * @param y Scale for y dimension
   * @param z Scale for z dimension
   */
  update_scale(x: number, y: number, z: number) {
    engine.rust.update_scale(this.id, x, y, z);
  }
  /**
   * Get rotation quaternion
   */
  get rotation(): Quaternion {
    return new Quaternion(
      engine.rust.memory.buffer,
      engine.rust.rotation_pointer(this.id),
    );
  }
  /**
   * Update rotation using quaternion
   * To use euler angles, use update_euler_angles
   */
  set rotation(
    args: [x: number, y: number, z: number, w: number] | Quaternion,
  ) {
    engine.rust.update_rotation(this.id, args[0], args[1], args[2], args[3]);
  }
  /**
   * Update rotation using euler angler
   */
  set euler_angles(values: [rad_x: number, rad_y: number, rad_z: number]) {
    engine.rust.update_euler_angles(this.id, ...values);
  }
  /**
   * Get rotation using euler angler
   */
  get euler_angles(): ReadOnlyTerraVector3 {
    const ptr = engine.rust.rotation_pointer_euler(this.id);
    return new ReadOnlyTerraVector3(engine.rust.memory.buffer, ptr);
  }
  set_scenes(id: number) {
    engine.rust.set_scenes(this.id, id);
  }
  update_dynamic_buffer(engine_lock: rust_pointer<'engine'>) {
    engine.rust.update_dynamic_buffer(engine_lock, this.id);
  }
  update_dynamic_buffer_from_mutex(
    engine_lock: rust_mutex<'locked', 'enginelock'>,
  ) {
    engine.rust.update_dynamic_buffer_from_mutex(engine_lock, this.id);
  }
  get scale_x(): number {
    return engine.rust.scale_x(this.id);
  }
  get scale_y(): number {
    return engine.rust.scale_y(this.id);
  }
  getScaleZ(enginelock: rust_mutex<'locked', 'enginelock'>): number {
    return engine.rust.scale_z(enginelock, this.id);
  }

  get_positions_count(engine_lock: rust_mutex<'locked', 'enginelock'>) {
    return engine.rust.positions_count(engine_lock, this.id);
  }
  set positions_count(positions_count: number) {
    engine.rust.set_positions_count(this.id, positions_count);
  }

  get strip(): boolean {
    return engine.rust.strip(this.id) === 1 ? true : false;
  }
  onMeshChange: Set<() => void> = new Set();
  onPhysicTick?: (time: number, engine_lock: rust_pointer<'engine'>) => void;

  get_transformation = (engine_lock: rust_mutex<'locked', 'enginelock'>) =>
    new TerraMatrix(
      engine.rust.memory.buffer,
      engine.rust.gpu_pointer(engine_lock, this.id),
    );

  getTranslation(engine_lock: rust_pointer<'engine'>): ReadOnlyTerraVector3 {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.translation_pointer(engine_lock, this.id),
    );
  }
  getTranslationFromMutex(
    engine_lock: rust_mutex<'locked', 'enginelock'>,
  ): ReadOnlyTerraVector3 {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.translation_pointer_from_mutex(engine_lock, this.id),
    );
  }
  setTranslation(
    engine_lock: rust_mutex<'locked', 'enginelock'>,
    value: [number, number, number] | ReadOnlyTerraVector3,
  ) {
    engine.rust.update_translation(
      engine_lock,
      this.id,
      value[0],
      value[1],
      value[2],
    );
  }
  get scale(): ReadOnlyTerraVector3 {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.scale_pointer(this.id),
    );
  }
  // TODO force per ms?
  apply_impulse(value: [number, number, number] | TerraVector3) {
    engine.rust.apply_impulse(this.id, value[0], value[1], value[2]);
  }
  getVelocity(engine_lock: rust_pointer<'engine'>): ReadOnlyTerraVector3 {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.velocity_pointer(engine_lock, this.id),
    );
  }
  getVelocityFromMutex(
    engine_lock: rust_mutex<'locked', 'enginelock'>,
  ): ReadOnlyTerraVector3 {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.velocity_pointer_from_mutex(engine_lock, this.id),
    );
  }
  setVelocity(
    engine_lock: rust_pointer<'engine'>,
    value: [number, number, number] | TerraVector3,
  ) {
    new MutableTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.velocity_pointer(engine_lock, this.id),
    ).set(value);
    this.update_dynamic_buffer(engine_lock);
  }
  setVelocityFromMutex(
    engine_lock: rust_mutex<'locked', 'enginelock'>,
    value: [number, number, number] | TerraVector3,
  ) {
    new MutableTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.velocity_pointer_from_mutex(engine_lock, this.id),
    ).set(value);
    this.update_dynamic_buffer_from_mutex(engine_lock);
  }
  intersect_box_aa_sphere(
    engine_lock: rust_mutex<'locked', 'enginelock'>,
    collider: ColliderJS,
    radius: number,
  ) {
    return engine.rust.intersect_box_aa_sphere(
      engine_lock,
      this.id,
      collider.collider_ptr,
      radius,
    );
  }
  get have_rigid_body() {
    return engine.rust.have_rigid_body(this.id);
  }
  constructor(props: MainNodeProps | number) {
    if (typeof props === 'number') {
      this.id = props;
    } else {
      const {
        point_light = 0,
        directional_light = 0,
        label,
        scenes,
        rigid_body = RigidBody.default,
      } = props;
      const sceneids = scenes
        ? scenes.reduce((acc, scene) => acc | scene.id, 0)
        : 1;
      this.id = engine.rust.new_mesh_from_js(
        point_light,
        directional_light,
        sceneids,
        rigid_body,
        ...create_rust_label(label),
        new Externref(false, this),
      );
    }
  }
  destroy() {
    this.drawable?.destroy();
  }
}
