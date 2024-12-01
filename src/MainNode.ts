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
import { create_rust_label } from './utils.js';
import { Externref } from './externref.js';
declare const engine: Engine;
const textDecoder = new TextDecoder();
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
    const [label_ptr, label_len] = new Uint32Array(
      engine.rust.memory.buffer,
      label_field_pointer,
      2,
    );
    return textDecoder.decode(
      new Uint8Array(engine.rust.memory.buffer, label_ptr, label_len),
    );
  }

  set color(data: [number, number, number, number]) {
    engine.rust.set_color(this.id, data[0], data[1], data[2], data[3]);
  }
  set ambient(data: [r: number, b: number, g: number]) {
    engine.rust.set_ambient(this.id, data[0], data[1], data[2]);
  }
  set shadow(shadow: number) {
    engine.rust.set_shadow(this.id, shadow);
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
  update_dynamic_buffer() {
    engine.rust.update_dynamic_buffer(this.id);
  }
  get scale_x(): number {
    return engine.rust.scale_x(this.id);
  }
  get scale_y(): number {
    return engine.rust.scale_y(this.id);
  }
  get scale_z(): number {
    return engine.rust.scale_z(this.id);
  }

  get positions_count() {
    return engine.rust.positions_count(this.id);
  }
  set positions_count(positions_count: number) {
    engine.rust.set_positions_count(this.id, positions_count);
  }

  get strip(): boolean {
    return engine.rust.strip(this.id) === 1 ? true : false;
  }
  onMeshChange: Set<() => void> = new Set();
  onPhysicTick?: (time: number) => void;

  get_transformation = () =>
    new TerraMatrix(
      engine.rust.memory.buffer,
      engine.rust.gpu_pointer(this.id),
    );

  get translation(): ReadOnlyTerraVector3 {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.translation_pointer(this.id),
    );
  }
  set translation(value: [number, number, number] | ReadOnlyTerraVector3) {
    engine.rust.update_translation(this.id, value[0], value[1], value[2]);
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
  get velocity(): ReadOnlyTerraVector3 {
    return new ReadOnlyTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.velocity_pointer(this.id),
    );
  }
  set velocity(value: [number, number, number] | TerraVector3) {
    new MutableTerraVector3(
      engine.rust.memory.buffer,
      engine.rust.velocity_pointer(this.id),
    ).set(value);
    this.update_dynamic_buffer();
  }
  intersect_box_aa_sphere(collider: ColliderJS, radius: number) {
    return engine.rust.intersect_box_aa_sphere(
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
