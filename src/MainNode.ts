import { ReadOnlyTerraVector3, TerraMatrix, TerraVector3 } from "./Math.js";
import type { Scene } from "./Scene.js";
import type { Engine, rust_pointer } from "./engine.js";
import type { ColliderJS } from "./Collider.js";
declare const engine: Engine;
export interface DrawableNode {
    positions_count: number;
    label: string;
    destroy(): void;
}
export abstract class MainNode implements DrawableNode {
    acceleration2: [number, number, number] = [0, 0, 0];
    //Actual velocity that occured last tick
    last_velocity: [number, number, number] = [0, 0, 0];
    last_acceleration: [number, number, number] = [0, 0, 0];
    label: string;
    get speed() {
        return Math.sqrt(this.velocity[0] * this.velocity[0] + this.velocity[1] * this.velocity[1] + this.velocity[2] * this.velocity[2])
    }
    get speedSquared() {
        return this.velocity[0] * this.velocity[0] + this.velocity[1] * this.velocity[1] + this.velocity[2] * this.velocity[2];
    }
    //coefficient of friction
    grip = 1;
    impulse: [number, number, number] = [0, 0, 0];

    set color(data: [number, number, number, number]) {
        engine.rust.set_color(this.ptr, data[0], data[1], data[2], data[3])
    }
    set ambient(data: [r: number, b: number, g: number]) {
        engine.rust.set_ambient(this.ptr, data[0], data[1], data[2])
    }
    set shadow(shadow: number) {
        engine.rust.set_shadow(this.ptr, shadow)
    }
    ptr: rust_pointer<"mesh">;
    get id() {
        return engine.rust.id(this.ptr)
    }
    update_scale(scale: number): void
    update_scale(x: number, y: number, z: number): void
    update_scale(x: number, y?: number, z?: number) {
        engine.rust.update_scale(this.ptr, x, y ?? x, z ?? x)
    }
    update_rotation(x: number, y: number, z: number, w: number) {
        engine.rust.update_rotation(this.ptr, x, y, z, w);
    }
    update_euler_angles(x: number, y: number, z: number) {
        engine.rust.update_euler_angles(this.ptr, x, y, z);
    }
    set_scenes(id: number) {
        engine.rust.set_scenes(this.ptr, id);
    }
    update_dynamic_buffer() {
        engine.rust.update_dynamic_buffer(this.ptr);
    }
    get scale_x(): number {
        return engine.rust.scale_x(this.ptr)
    }
    get scale_y(): number {
        return engine.rust.scale_y(this.ptr)
    }
    get scale_z(): number {
        return engine.rust.scale_z(this.ptr)
    }

    get positions_count() {
        return engine.rust.positions_count(this.ptr);
    }
    set positions_count(positions_count: number) {
        engine.rust.set_positions_count(this.ptr, positions_count);
    }

    get strip(): boolean {
        return engine.rust.strip(this.ptr) === 1 ? true : false;
    }

    onPhysicTick?: (time: number) => void;
    hasGravity = false;
    isStatic = false;
    static uniqueID = 1;
    static Meshes: Map<number, MainNode> = new Map();

    get_transformation = () => new TerraMatrix(engine.memory.buffer, engine.rust.gpu_pointer(this.ptr))//new TerraMatrix(this.data.buffer);

    get translation(): ReadOnlyTerraVector3 {
        return new ReadOnlyTerraVector3(engine.memory.buffer, engine.rust.translation_pointer(this.ptr));
    }
    set translation(value: [number, number, number] | TerraVector3) {
        engine.rust.update_translation(this.ptr, value[0], value[1], value[2]);
    }
    // TODO force per ms?
    apply_impulse(value: [number, number, number] | TerraVector3) {
        engine.rust.apply_impulse(this.ptr, value[0], value[1], value[2]);
    }
    get velocity(): ReadOnlyTerraVector3 {
        return new ReadOnlyTerraVector3(engine.memory.buffer, engine.rust.velocity_pointer(this.ptr))
    }
    set velocity(value: [number, number, number] | TerraVector3) {
        new TerraVector3(engine.memory.buffer, engine.rust.velocity_pointer(this.ptr)).set(value);
        this.update_dynamic_buffer();
    }
    intersect_box_aa_sphere(collider: ColliderJS, radius: number) {
        return engine.rust.intersect_box_aa_sphere(this.ptr, collider.collider_ptr, radius)
    }
    constructor(
        { positionsCount = 0,
            point_light = 0,
            directional_light = 0,
            strip = false,
            label,
            scenes,
            fixed = false,
            rigid_body = true }:
            {
                positionsCount?: number,
                point_light?: number,
                directional_light?: number,
                strip?: boolean,
                label: string,
                scenes?: Scene[] | undefined,
                fixed?: boolean,
                rigid_body?: boolean,
            }
    ) {
        this.label = label;
        const sceneids = scenes ? scenes.reduce((acc, scene) => acc | scene.id, 0) : 1;
        const label_ptr = engine.rust.alloc_string(label.length);
        const view = new Uint8Array(engine.rust.memory.buffer, label_ptr, label.length);
        view.set(new TextEncoder().encode(label));

        this.ptr = engine.rust.new_mesh(MainNode.uniqueID++, positionsCount, point_light, directional_light, sceneids, strip, fixed, rigid_body, label_ptr);
        MainNode.Meshes.set(this.id, this);
    }
    destroy() {
        MainNode.Meshes.delete(this.id);
    }
}
