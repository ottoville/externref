import { ReadOnlyTerraVector3, TerraMatrix, TerraVector3 } from "./Math.js";
import type { Scene } from "./Scene.js";
import type { Engine, rust_pointer } from "./engine.js";
import type { ColliderJS } from "./Collider.js";
declare const engine:Engine;

export abstract class MainNode {
    acceleration2: [number, number, number]=[0,0,0];
    //Actual velocity that occured last tick
    last_velocity: [number, number, number]=[0,0,0];
    get speed() {
        return Math.sqrt(this.last_velocity[0]*this.last_velocity[0]+this.last_velocity[1]*this.last_velocity[1]+this.last_velocity[2]*this.last_velocity[2])
    }
    //coefficient of friction
    grip=0;
    // TODO force per ms?
    force: [number, number, number]=[0,0,0];
    is_colliding=false;
    set gpu_custom_data(data:[number,number,number,number]) {
        engine.rust.set_gpu_custom_data(this.ptr,data[0],data[1],data[2],data[3])
    }
    ptr: rust_pointer<"mesh">;
    get id() {
        return engine.rust.id(this.ptr)
    }
    update_scale(x: number, y: number, z: number) {
        engine.rust.update_scale(this.ptr, x,y,z)
    }
    update_rotation(x: number, y: number, z: number, w: number) {
        engine.rust.update_rotation(this.ptr,x,y,z,w);
    }
    update_euler_angles(x: number, y: number, z: number) {
        engine.rust.update_euler_angles(this.ptr,x,y,z);
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

    get strip(): boolean {
        return engine.rust.strip(this.ptr)===1?true:false;
    }

    onPhysicTick?: (time: number) => void;
    hasGravity = false;
    isStatic = false;
    static uniqueID = 1;
    static Meshes: Map<number, MainNode> = new Map();
    static GPUDataSize = /*transform matrix */16 /*delta */ +4 /*custom */ +4 /* acceleration */ +4 /*id */ +1 /*point_light */ +1 /*directional_light*/ +1 /*scenes*/+1;
    static alignment = 256;
    /* Todo: make dynamic with treshold values */
    static maxInstances = 10;  //HOX! change also to calculatePickingRays.comp shader

    get_transformation = () => new TerraMatrix(engine.memory.buffer, engine.rust.gpu_pointer(this.ptr))//new TerraMatrix(this.data.buffer);

    get translation(): ReadOnlyTerraVector3 {
        return new ReadOnlyTerraVector3(engine.memory.buffer, engine.rust.translation_pointer(this.ptr));
    }
    set translation(value: [number, number, number] | TerraVector3) {
        engine.rust.update_translation(this.ptr, value[0], value[1], value[2])
    }
    get velocity(): ReadOnlyTerraVector3 {
        return new TerraVector3(engine.memory.buffer, engine.rust.velocity_pointer(this.ptr))
    }
    set velocity(value: [number, number, number] | TerraVector3) {
        this.velocity.set(value);
        this.update_dynamic_buffer();
    }
    get acceleration(): ReadOnlyTerraVector3 {
        return new TerraVector3(engine.memory.buffer, engine.rust.acceleration_pointer(this.ptr))
    }
    set acceleration(value: [number, number, number] | TerraVector3) {
        this.acceleration.set(value);
        this.update_dynamic_buffer();
    }
    intersect_box_aa_sphere(collider:ColliderJS, radius: number) {
        return engine.rust.intersect_box_aa_sphere(this.ptr,collider.collider_ptr, radius)
    }
    constructor(
        positionsCount = 0,
        point_light=0,
        directional_light=0,
        strip=false,
        public label:string,
        scenes?:Scene[],
        ) {
        const sceneids=scenes?scenes.reduce((acc, scene) => acc | scene.id,0):1;
        this.ptr=engine.rust.new_mesh(MainNode.uniqueID++, positionsCount, point_light, directional_light, sceneids, strip);     
        MainNode.Meshes.set(this.id, this);
    }
    destroy() {
        // TODO
    }
}