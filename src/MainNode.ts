import { ReadOnlyTerraVector3, TerraMatrix, TerraVector3 } from "./Math.js";
import type { Scene } from "./Scene.js";
import type { Engine } from "./engine.js";
declare const engine:Engine;

export abstract class MainNode {
    set gpu_custom_data(data:[number,number,number,number]) {
        engine.rust.set_gpu_custom_data(this.ptr,data[0],data[1],data[2],data[3])
    }
    ptr: number;
    get id() {
        return engine.rust.id(this.ptr)
    }
    update_scale(x: number, y: number, z: number) {
        engine.rust.update_scale(this.ptr, x,y,z)
    }
    update_rotation(x: number, y: number, z: number, w: number) {
        engine.rust.update_rotation(this.ptr,x,y,z,w);
    }
    set_scenes(id: number) {
        engine.rust.set_scenes(this.ptr, id);
    }
    update_dynamic_buffer() {
        engine.rust.update_dynamic_buffer(this.ptr);
    }
    set_vertices(vertices: Float32Array) {
        const ptr = engine.rust.alloc_vector_f32(vertices.length);
        new Float32Array(engine.rust.memory.buffer,ptr,vertices.length).set(vertices);
        engine.rust.update_vertices(this.ptr, ptr, vertices.length);
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

    get faces_count() {
        return engine.rust.faces_count(this.ptr);
    }
    get vertices_count() {
        return engine.rust.vertices_count(this.ptr);
    }
    get vertices_stride(): number{
        return engine.rust.vertices_stride(this.ptr);
    }
    set faces(faces:Float32Array)  {
        const ptr = engine.rust.alloc_vector_f32(faces.length);
        new Float32Array(engine.rust.memory.buffer,ptr,faces.length).set(faces);
        engine.rust.set_faces(this.ptr, ptr, faces.length);
    }

    get last_collider_world_vertices_pointer() {
        return engine.rust.last_collider_world_vertices_pointer(this.ptr);
    }
    get positions_count() {
        return engine.rust.positions_count(this.ptr);
    }

    get strip(): boolean {
        return engine.rust.strip(this.ptr)===1?true:false;
    }
    get acceleration_pointer(): number {
        throw('not implemented')
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
        const translation =  new TerraVector3(engine.memory.buffer, engine.rust.translation_pointer(this.ptr));
        translation.set(value);
        this.update_dynamic_buffer();
    }
    get velocity(): ReadOnlyTerraVector3 {
        return new TerraVector3(engine.memory.buffer, engine.rust.velocity_pointer(this.ptr))
    }
    set velocity(value: [number, number, number] | TerraVector3) {
        this.velocity.set(value);
        this.update_dynamic_buffer();
    }
    get acceleration(): ReadOnlyTerraVector3 {
        return new TerraVector3(engine.memory.buffer, this.acceleration_pointer)
    }
    set acceleration(value: [number, number, number] | TerraVector3) {
        this.acceleration.set(value);
    }
    get bounding_min() {
        return new TerraVector3(engine.memory.buffer,engine.rust.bounding_min_pointer(this.ptr));
    }
    get bounding_max() {
        return new TerraVector3(engine.memory.buffer,engine.rust.bounding_max_pointer(this.ptr));
    }
    constructor(
        hasBounding = false,
        has_geometry = false,
        positionsCount = 0,
        vertices_stride = 3,
        point_light=0,
        directional_light=0,
        static_faces=false,
        strip=false,
        public label:string,
        scenes?:Scene[],
        ) {
        const sceneids=scenes?scenes.reduce((acc, scene) => acc | scene.id,0):1;
        //super(engine.rustEngine, MainNode.uniqueID++, hasBounding, has_geometry, positionsCount, vertices_stride, point_light, directional_light, sceneids, static_faces, strip);
        this.ptr=engine.rust.new_mesh(MainNode.uniqueID++, hasBounding, has_geometry, positionsCount, vertices_stride, point_light, directional_light, sceneids, static_faces, strip)
       
        MainNode.Meshes.set(this.id, this);
    }
    destroy() {
        // TODO
    }
}