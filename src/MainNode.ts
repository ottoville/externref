import {
  MutableTerraVector3,
  Quaternion,
  ReadOnlyTerraVector3,
  TerraMatrix,
  TerraVector3,
} from './Math.js';
import type { Scene } from './Scene.js';
import type { Engine } from './engine.js';
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
  camera_can_collide_do: boolean;
};

export abstract class MainNode implements Destroyable {
  abstract drawable?: Drawable | undefined;

  readonly id: rust_pointer<'mesh_id'>;
  get label(): string {
    const label_field_pointer = engine.rust.label_field_pointer(this.id);
    return stringFromPtr(engine.rust.memory, label_field_pointer);
  }
  setColorFromId(data: [number, number, number, number]) {
    engine.rust.set_color_from_id(this.id, data[0], data[1], data[2], data[3]);
  }
  setAmbientFromId(data: [r: number, b: number, g: number]) {
    engine.rust.set_ambient_from_id(this.id, data[0], data[1], data[2]);
  }
  setShadowFromId(shadow: number) {
    engine.rust.set_shadow_from_id(this.id, shadow);
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
  update_dynamic_buffer_from_id() {
    engine.rust.update_dynamic_buffer_from_id(this.id);
  }
  get scale_x(): number {
    return engine.rust.scale_x(this.id);
  }
  get scale_y(): number {
    return engine.rust.scale_y(this.id);
  }
  getScaleZ(): number {
    return engine.rust.scale_z(this.id);
  }

  get_positions_count() {
    return engine.rust.positions_count(this.id);
  }
  set positions_count(positions_count: number) {
    engine.rust.set_positions_count(this.id, positions_count);
  }

  get strip(): boolean {
    return engine.rust.strip(this.id) === 1 ? true : false;
  }
  onMeshChange: Set<() => void> = new Set();
  onPhysicTick?: (time: number, mesh: rust_pointer<'mesh'>) => void;

  get_transformation = () =>
    new TerraMatrix(
      engine.rust.memory.buffer,
      engine.rust.gpu_pointer(this.id),
    );

  static getTranslation(mesh: rust_pointer<'mesh'>): ReadOnlyTerraVector3 {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.translation_pointer(mesh),
    );
  }
  getTranslationFromId() {
    return new Float32Array(
      engine.rust.memory.buffer,
      engine.rust.translation_pointer_from_id(this.id),
      3,
    ) as unknown as readonly [number, number, number];
  }
  setTranslation(value: [number, number, number] | ReadOnlyTerraVector3) {
    engine.rust.update_translation(this.id, value[0], value[1], value[2]);
  }
  get scale(): ReadOnlyTerraVector3 {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.scale_pointer(this.id),
    );
  }
  static getVelocity(mesh: rust_pointer<'mesh'>): ReadOnlyTerraVector3 {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.velocity_pointer(mesh),
    );
  }
  getVelocityFromId(): ReadOnlyTerraVector3 {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.velocity_pointer_from_id(this.id),
    );
  }
  static setVelocity(
    mesh: rust_pointer<'mesh'>,
    value: [number, number, number] | TerraVector3,
  ) {
    new MutableTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.velocity_pointer(mesh),
    ).set(value);
    engine.rust.update_dynamic_buffer(mesh);
  }
  setVelocityFromId(value: [number, number, number] | TerraVector3) {
    new MutableTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.velocity_pointer_from_id(this.id),
    ).set(value);
    this.update_dynamic_buffer_from_id();
  }
  get have_rigid_body() {
    return engine.rust.have_rigid_body(this.id);
  }
  constructor(props: MainNodeProps | rust_pointer<'mesh_id'>) {
    if (typeof props === 'number') {
      this.id = props;
    } else {
      const {
        point_light = 0,
        directional_light = 0,
        label,
        scenes,
        rigid_body = RigidBody.default,
        camera_can_collide_do,
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
        camera_can_collide_do,
      );
    }
  }
  #destroyed = false;
  destroy() {
    //prevent destroy loop between rust and js
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.drawable?.destroy();
    engine.rust.destroy_mesh(this.id);
  }
}
