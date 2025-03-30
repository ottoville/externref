use crate::allocators::explicit_freelist::ExplicitFreeList;
use crate::allocators::explicit_generational_freelist::ExplicitGenerationalFreeList;
use crate::allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;
use crate::character::Character;
pub use crate::drawable::DrawCommand;
#[cfg(target_arch = "wasm32")]
use crate::engine::vertices_change;
pub use crate::engine::ENGINE;
pub use crate::geometry::Geometry;
use crate::math2::Mat3wgslF32;
use crate::mesh_property::MeshProperty;
pub use crate::GPUMesh;
use crate::MULTIVALUE_F32;
use crate::MULTIVALUE_USIZE;
use collider::ColliderSphere;
use core::panic;
use externref::externref;
use externref::Resource;
use rapier3d::prelude::*;
use std::sync::atomic::AtomicUsize;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::MutexGuard;
use terramath::MatrixMath;
use terramath::Plane;
use terramath::Quaternion;
use terramath::Vec3wgslF32;

pub struct JSMesh(());
static MESH_ID: AtomicUsize = AtomicUsize::new(0);
pub struct Mesh {
    pub mesh_property: Arc<Mutex<MeshProperty>>,
    pub geometry: Option<Box<Geometry>>,

    /**
     Force only this amount of positions to be drawn.
     If not set, use vertexbuffer length by default
     Hox: This is NOT amount of indices
    */
    pub positions_count: Option<usize>,
    pub draw_command: Option<DrawCommand>,
    pub rigid_body_handle: Option<RigidBodyHandle>,
    pub collider_handle: Option<ColliderHandle>,
    pub label: String,
    kinematic_velocity: [f32; 4],
    drawable: Option<DrawCommand>,
    pub on_gpu_queue: bool,
    pub externref: Option<Resource<JSMesh>>,
    pub character: Option<Character>,
    id: usize,
}

#[externref]
#[no_mangle]
pub unsafe extern "C" fn new_mesh_from_js(
    point_light: f32,
    directional_light: f32,
    scenes: f32,
    rigid_body: u32,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
    externref: Resource<JSMesh>,
    camera_can_collide_to: bool,
) -> *const ExplicitGenerationalFreeListIndex<Mesh> {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    return Box::into_raw(Box::new(Mesh::new(
        point_light,
        directional_light,
        scenes,
        rigid_body,
        label,
        Some(externref),
        None,
        ENGINE.meshes.lock().unwrap(),
        camera_can_collide_to,
    )));
}
#[no_mangle]
pub unsafe extern "C" fn get_geometry<'frame>(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> *const Geometry {
    let mesh = &ENGINE.meshes.lock().unwrap()[&*mesh_id];
    mesh.geometry.as_ref().unwrap().as_ref() as *const Geometry
}
#[no_mangle]
pub unsafe extern "C" fn set_geometry<'frame>(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    geometry: *mut Geometry,
) -> *mut Geometry {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    mesh.geometry = Some(Box::from_raw(geometry));
    mesh.geometry.as_mut().unwrap().as_mut() as *mut Geometry
}

#[no_mangle]
pub unsafe extern "C" fn add_collider(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    collider: *mut Collider,
) {
    let coll = Box::from_raw(collider);
    ENGINE
        .engine2
        .lock()
        .unwrap()
        .add_collider_to_mesh(*coll, &*mesh_id);
}

#[no_mangle]
pub unsafe extern "C" fn faces_count(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> usize {
    let mesh = &ENGINE.meshes.lock().unwrap()[&*mesh_id];
    mesh.get_geometry().faces_count()
}
#[no_mangle]
pub unsafe extern "C" fn update_scale(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    x: f32,
    y: f32,
    z: f32,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    {
        let mut mesh_property = mesh.mesh_property.lock().unwrap();
        mesh_property.update_scale(x, y, z);
    }
    mesh.on_update(true);
}
#[no_mangle]
pub unsafe extern "C" fn calculate_normals(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    mesh.calculate_normals();
}
#[no_mangle]
pub unsafe extern "C" fn update_dynamic_buffer(mesh: *mut Mesh) {
    (*mesh).update_dynamic_buffer();
}
#[no_mangle]
pub unsafe extern "C" fn update_dynamic_buffer_from_id(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    mesh.update_dynamic_buffer();
}
#[no_mangle]
pub unsafe extern "C" fn have_rigid_body(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> bool {
    ENGINE.meshes.lock().unwrap()[&*mesh_id]
        .rigid_body_handle
        .is_some()
}
#[no_mangle]
pub unsafe extern "C" fn update_euler_angles(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    x: f32,
    y: f32,
    z: f32,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    {
        let mut mesh_property = mesh.mesh_property.lock().unwrap();
        mesh_property.update_euler_angles(x, y, z);
    }
    mesh.on_update(true);
}
#[no_mangle]
pub unsafe extern "C" fn update_rotation(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    x: f32,
    y: f32,
    z: f32,
    w: f32,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    {
        let mut mesh_property = mesh.mesh_property.lock().unwrap();
        mesh_property.update_rotation(x, y, z, w);
    }
    mesh.on_update(true);
}
#[no_mangle]
pub unsafe extern "C" fn update_translation(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    x: f32,
    y: f32,
    z: f32,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    // No onupdate is called here because it is called inside set_translation.
    mesh.update_translation(x, y, z, true);
}
#[no_mangle]
pub unsafe extern "C" fn label_field_pointer(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> *const usize {
    let label = &ENGINE.meshes.lock().unwrap()[&*mesh_id].label;
    MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = label.len();
    MULTIVALUE_USIZE[2] = label.capacity();
    MULTIVALUE_USIZE.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn gpu_alignment(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> usize {
    ENGINE.meshes.lock().unwrap()[&*mesh_id]
        .mesh_property
        .lock()
        .unwrap()
        .gpu_mesh_alignment
        .0
}
#[no_mangle]
pub unsafe extern "C" fn positions_count(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> usize {
    ENGINE.meshes.lock().unwrap()[&*mesh_id].get_positions_count()
}
#[no_mangle]
pub unsafe extern "C" fn set_positions_count(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    positions_count: usize,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    mesh.positions_count = Some(positions_count);
}
#[no_mangle]
pub unsafe extern "C" fn strip(mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>) -> bool {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];

    mesh.get_geometry().strip
}
#[no_mangle]
pub unsafe extern "C" fn gpu_pointer(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> *const [[f32; 4]; 4] {
    &ENGINE.meshes.lock().unwrap()[&*mesh_id]
        .mesh_property
        .lock()
        .unwrap()
        .gpu_memory
        .transformation
}
#[no_mangle]
pub unsafe extern "C" fn translation_pointer(mesh: *const Mesh) -> *const Vec3wgslF32 {
    &(*mesh).mesh_property.lock().unwrap().translation
}
#[no_mangle]
pub unsafe extern "C" fn translation_pointer_from_id(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> *const Vec3wgslF32 {
    &ENGINE.meshes.lock().unwrap()[&*mesh_id]
        .mesh_property
        .lock()
        .unwrap()
        .translation
}
#[no_mangle]
pub unsafe extern "C" fn rotation_pointer(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> *const Quaternion {
    &(ENGINE.meshes.lock().unwrap()[&*mesh_id]
        .mesh_property
        .lock()
        .unwrap()
        .rotation)
}
#[no_mangle]
pub unsafe extern "C" fn scale_pointer(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> *const [f32; 3] {
    &ENGINE.meshes.lock().unwrap()[&*mesh_id]
        .mesh_property
        .lock()
        .unwrap()
        .scaling
}
#[no_mangle]
pub unsafe extern "C" fn rotation_pointer_euler(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> *const f32 {
    let mut euler = [0.0, 0.0, 0.0];
    ENGINE.meshes.lock().unwrap()[&*mesh_id]
        .mesh_property
        .lock()
        .unwrap()
        .rotation
        .to_euler_angles(&mut euler);
    MULTIVALUE_F32[0] = euler[0];
    MULTIVALUE_F32[1] = euler[1];
    MULTIVALUE_F32[2] = euler[2];
    return MULTIVALUE_F32.as_ptr();
}
#[no_mangle]
pub unsafe extern "C" fn velocity_pointer(mesh: *const Mesh) -> *const [f32; 4] {
    &(*mesh).kinematic_velocity
}
#[no_mangle]
pub unsafe extern "C" fn velocity_pointer_from_id(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> *const [f32; 4] {
    &ENGINE.meshes.lock().unwrap()[&*mesh_id].kinematic_velocity
}

#[no_mangle]
pub unsafe extern "C" fn create_trimesh_collider(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> *mut Collider {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    let scaling = mesh.mesh_property.lock().unwrap().scaling.clone();
    let geometry = mesh.get_geometry_mut();
    geometry.create_trimesh_collider(scaling)
}
#[no_mangle]
pub unsafe extern "C" fn create_convex_collider(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    collision_events: bool,
) -> *mut Collider {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    let scaling = mesh.mesh_property.lock().unwrap().scaling.clone();
    let geometry = mesh.get_geometry_mut();
    geometry.create_convex_collider(collision_events, scaling)
}

#[no_mangle]
pub unsafe extern "C" fn scale_x(mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>) -> f32 {
    ENGINE.meshes.lock().unwrap()[&*mesh_id]
        .mesh_property
        .lock()
        .unwrap()
        .scaling[0]
}
#[no_mangle]
pub unsafe extern "C" fn scale_y(mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>) -> f32 {
    ENGINE.meshes.lock().unwrap()[&*mesh_id]
        .mesh_property
        .lock()
        .unwrap()
        .scaling[1]
}
#[no_mangle]
pub unsafe extern "C" fn scale_z(mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>) -> f32 {
    ENGINE.meshes.lock().unwrap()[&*mesh_id]
        .mesh_property
        .lock()
        .unwrap()
        .scaling[2]
}
#[no_mangle]
pub unsafe extern "C" fn set_color(
    mesh_ptr: *mut Mesh,
    data_0: f32,
    data_1: f32,
    data_2: f32,
    data_3: f32,
) {
    let mesh = &mut (*mesh_ptr);
    {
        let mut mesh_property = mesh.mesh_property.lock().unwrap();
        mesh_property.update_color(data_0, data_1, data_2, data_3);
    }
    mesh.on_update(false);
}
#[no_mangle]
pub unsafe extern "C" fn set_color_from_id(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    data_0: f32,
    data_1: f32,
    data_2: f32,
    data_3: f32,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    {
        let mut mesh_property = mesh.mesh_property.lock().unwrap();
        mesh_property.update_color(data_0, data_1, data_2, data_3);
    }
    mesh.on_update(false);
}
#[no_mangle]
pub unsafe extern "C" fn set_ambient(
    mesh_ptr: *mut Mesh,
    ambient_r: f32,
    ambient_g: f32,
    ambient_b: f32,
) {
    let mesh = &mut (*mesh_ptr);

    let mut mesh_property = mesh.mesh_property.lock().unwrap();

    mesh_property.gpu_memory.ambient[0] = ambient_r;
    mesh_property.gpu_memory.ambient[1] = ambient_g;
    mesh_property.gpu_memory.ambient[2] = ambient_b;
}
#[no_mangle]
pub unsafe extern "C" fn set_ambient_from_id(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    ambient_r: f32,
    ambient_g: f32,
    ambient_b: f32,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];

    let mut mesh_property = mesh.mesh_property.lock().unwrap();

    mesh_property.gpu_memory.ambient[0] = ambient_r;
    mesh_property.gpu_memory.ambient[1] = ambient_g;
    mesh_property.gpu_memory.ambient[2] = ambient_b;
}
#[no_mangle]
pub unsafe extern "C" fn set_shadow(mesh_ptr: *mut Mesh, shadow: f32) {
    let mesh = &mut (*mesh_ptr);

    let mut mesh_property = mesh.mesh_property.lock().unwrap();
    mesh_property.gpu_memory.shadow = shadow;
}
#[no_mangle]
pub unsafe extern "C" fn set_shadow_from_id(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    shadow: f32,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];

    let mut mesh_property = mesh.mesh_property.lock().unwrap();
    mesh_property.gpu_memory.shadow = shadow;
}
#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub unsafe extern "C" fn test_triangles(
    collider_ptr: *mut collider::Collider,
    collider_sphere: *mut ColliderSphere,
    world_position: *const [f32; 3],
    world_velocity_x: f32,
    world_velocity_y: f32,
    world_velocity_z: f32,
) -> bool {
    let collider = (&mut *collider_ptr);
    //TODO: really, here inside the loop?
    return ENGINE.engine2.lock().unwrap().check_collisions(
        collider,
        &*collider_sphere,
        &*world_position,
        world_velocity_x,
        world_velocity_y,
        world_velocity_z,
    );
}
#[no_mangle]
pub unsafe extern "C" fn set_scenes(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    scenes: u32,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    {
        let mut mesh_property = mesh.mesh_property.lock().unwrap();
        mesh_property.set_scenes(scenes);
    }
    mesh.update_dynamic_buffer();
}
#[no_mangle]
pub unsafe extern "C" fn update_scale_and_rotation(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    x: f32,
    y: f32,
    z: f32,
    rx: f32,
    ry: f32,
    rz: f32,
    rw: f32,
) {
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
    {
        let mut mesh_property = mesh.mesh_property.lock().unwrap();
        mesh_property.update_scale_and_rotation(x, y, z, rx, ry, rz, rw);
    }
    mesh.on_update(true);
}
#[no_mangle]
pub unsafe extern "C" fn faces_pointer(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> *const Plane {
    let meshes = ENGINE.meshes.lock().unwrap();
    let geometry = meshes[&*mesh_id].get_geometry();
    if !geometry.static_faces && geometry.planes.planes.len() == 0 {
        panic!("Not implemented yet, TODO: Generate faces");
        //Remember to allocate memory for collider planes also and other collider stuff also
    }
    return geometry.planes.planes.as_ptr();
}

impl Mesh {
    pub fn draw(&self) -> *const usize {
        &self.draw_command as *const _ as *const usize
    }
}

impl Mesh {
    #[cfg(target_arch = "wasm32")]
    pub fn check_collision(
        &mut self,
        collider: &mut collider::Collider,
        collider_sphere: &ColliderSphere,
    ) {
        //TODO: When there is support for bounding sphere.
        //  var distance = Vector3.Distance(Vector3.FromArray(this._basePointWorld), sphereCenter);
        /*   if (distance > this._velocityWorldLength + max + sphereRadius) {
            return false;
        }*/

        if !self.intersect_box_aa_sphere(collider, collider_sphere.collision_radius) {
            return;
        }
        if let Some(geometry) = &mut self.geometry {
            let transformation = self.mesh_property.lock().unwrap().gpu_memory.transformation;
            // TODO: keep colliderplanes in memory for x amount of collisionsScalingMatrix
            transformation.multiply(
                &collider_sphere.collisions_scaling_matrix,
                &mut geometry.collisions_transform_matrix,
            );
            geometry.check_collision(collider);
        } else {
            panic!("Mesh {} has no geometry", self.label)
        };
    }
    /**
     * Get positions count if set, otherwise fallback to vertices count.
     * This is because vertex buffr can hold extra vertices that are not drawn.
     */
    pub fn get_positions_count(&self) -> usize {
        match self.positions_count {
            Some(positions_count) => {
                return positions_count;
            }
            None => {
                return self.get_geometry().vertices.length();
            }
        }
    }
    pub fn new<'a>(
        point_light: f32,
        directional_light: f32,
        scenes: f32,
        rigid_body: u32, //0: no rigid body, 1: normal rigid body, 2: fixed rigid body
        label: String,
        externref: Option<Resource<JSMesh>>,
        mesh_property_opt: Option<Arc<Mutex<MeshProperty>>>,
        mut meshes: MutexGuard<'_, ExplicitGenerationalFreeList<Mesh>>,
        camera_can_collide_to: bool,
    ) -> ExplicitGenerationalFreeListIndex<Mesh> {
        let engine = &mut ENGINE.engine2.lock().unwrap();
        let mesh_id = MESH_ID.fetch_add(1, Ordering::Relaxed);
        let mesh_property = mesh_property_opt.unwrap_or_else(|| {
            let gpu_mesh_alignment = engine.gpu_allocated.allocate();
            let maybegpu = &mut ENGINE.gpu.lock().unwrap();
            if let Some(gpu) = maybegpu.as_mut() {
                if point_light > 0.0 {
                    gpu.point_lights.push(gpu_mesh_alignment);
                }
                if directional_light > 0.0 {
                    gpu.directional_lights.push(gpu_mesh_alignment);
                }
            };
            Arc::new(Mutex::new(MeshProperty {
                gpu_memory: GPUMesh {
                    transformation: MatrixMath::identity(),
                    transformation_normals: Mat3wgslF32::identity(),
                    ambient: [0.0, 0.0, 0.0],
                    shadow: 0.0,
                    color: [0.0, 0.0, 0.0, 0.0],
                    spotlight: [0.0, 0.0, 0.0, 0.0],
                    _id: mesh_id,
                    point_light_squared: point_light * point_light,
                    directional_light,
                    scenes: scenes as u32,
                },
                gpu_mesh_alignment,
                transformation: MatrixMath::identity(),
                transformation_is_dirty: true,
                translation: Vec3wgslF32([0.0; 3]),
                rotation: Quaternion {
                    i: 0.0,
                    j: 0.0,
                    k: 0.0,
                    w: 1.0,
                },
                scaling: [1.0; 3],
                color: [1.0, 0.0, 0.0, 0.0],
                on_change: ExplicitFreeList::new(8),
            }))
        });
        let m = Mesh {
            mesh_property,
            geometry: None,
            kinematic_velocity: [0.0, 0.0, 0.0, 0.0],
            positions_count: Option::None,
            draw_command: Option::None,
            rigid_body_handle: None,
            collider_handle: None,
            label,
            drawable: Option::None,
            on_gpu_queue: false,
            externref,
            character: None,
            id: mesh_id,
        };
        let id = meshes.insert(m);
        if camera_can_collide_to {
            engine.camera_can_collide_meshes.push(id.clone());
        }
        meshes[&id].update_dynamic_buffer();
        if rigid_body > 0 {
            let rigid_body_builder: RigidBodyBuilder;
            if rigid_body == 2 {
                rigid_body_builder = RigidBodyBuilder::fixed().ccd_enabled(true);
            } else {
                rigid_body_builder = RigidBodyBuilder::dynamic().sleeping(true).ccd_enabled(true);
            }
            let rigid_body = rigid_body_builder.build();

            let rigid_body_handle = engine.rigid_body_set.insert(rigid_body);
            meshes[&id].rigid_body_handle = Some(rigid_body_handle);
            engine.rigid_bodies.insert(rigid_body_handle, id.clone());
        }
        return id;
    }
    pub fn get_geometry(&self) -> &Geometry {
        if let Some(g) = &self.geometry {
            g
        } else {
            panic!("Mesh {} has no geometry", self.label)
        }
    }
    pub fn get_geometry_mut(&mut self) -> &mut Geometry {
        if let Some(g) = &mut self.geometry {
            g
        } else {
            panic!("Mesh {} has no geometry", self.label)
        }
    }
    pub fn update_translation(&mut self, x: f32, y: f32, z: f32, physics: bool) {
        {
            let mut mesh_property = self.mesh_property.lock().unwrap();
            mesh_property.translation.0 = [x, y, z];
        }
        self.on_update(physics);
    }
    pub fn update_translation_vec(&mut self, vec: [f32; 3], physics: bool) {
        {
            let mut mesh_property = self.mesh_property.lock().unwrap();
            mesh_property.translation.0 = vec;
        }
        self.on_update(physics);
    }
    pub unsafe fn apply_impulse(&mut self, x: f32, y: f32, z: f32) {
        match self.rigid_body_handle {
            Some(rigid_body_handle) => {
                let mut engine = ENGINE.engine2.lock().unwrap();
                let rigid_body = engine.rigid_body_set.get_mut(rigid_body_handle);
                match rigid_body {
                    Some(rigid_body) => rigid_body.apply_impulse(vector![x, y, z], true),
                    None => panic!("Rigid body not found"),
                };
            }
            _ => {}
        }
    }
    pub fn update_dynamic_buffer(&mut self) {
        self.on_gpu_queue = true;
    }
    /**
     * To be called when mesh property change
     *  param physics: If change affects physics, set true when translation, rotation or scale changes.
     */
    pub fn on_update(&mut self, physics: bool) {
        self.update_dynamic_buffer();
        let mut mesh_property = self.mesh_property.lock().unwrap();
        mesh_property.transformation_is_dirty = true;
        if physics {
            if let Some(rigid_body_handle) = self.rigid_body_handle {
                let mut engine = ENGINE.engine2.lock().unwrap();
                let rigid_body = engine.rigid_body_set.get_mut(rigid_body_handle);
                match rigid_body {
                    Some(rigid_body) => {
                        rigid_body.set_translation(
                            vector![
                                mesh_property.translation.0[0],
                                mesh_property.translation.0[1],
                                mesh_property.translation.0[2]
                            ],
                            true,
                        );
                        rigid_body.set_rotation(
                            nalgebra::Unit::from_quaternion(nalgebra::Quaternion::new(
                                mesh_property.rotation.w,
                                mesh_property.rotation.i,
                                mesh_property.rotation.j,
                                mesh_property.rotation.k,
                            )),
                            true,
                        )
                    }
                    None => panic!("Rigid body not found"),
                };
            }
            if let Some(geometry) = &mut self.geometry {
                geometry.bounding_box.dirty = true;
            }
        }
    }
    pub fn intersect_box_aa_sphere(&mut self, collider: &collider::Collider, radius: f32) -> bool {
        let mesh_property = &mut self.mesh_property.lock().unwrap();
        let transformation = mesh_property.get_transformation();
        if let Some(g) = &mut self.geometry {
            g.bounding_box
                .update_bounding_box(&g.vertices, &transformation);
            g.bounding_box.intersect_box_aa_sphere(collider, radius)
        } else {
            panic!("Mesh {} has no geometry", self.label)
        }
    }
    pub fn calculate_normals(&mut self) {
        self.get_geometry_mut().calculate_normals();
        #[cfg(target_arch = "wasm32")]
        unsafe {
            if let Some(externref) = &self.externref {
                vertices_change(externref);
            }
        }
    }
}
// TODO: fix lights are now shared with mesh property

impl Drop for Mesh {
    fn drop(&mut self) {
        let mesh_property = self.mesh_property.lock().unwrap();
        if mesh_property.gpu_memory.point_light_squared > 0.0 {
            ENGINE
                .gpu
                .lock()
                .unwrap()
                .as_mut()
                .unwrap()
                .point_lights
                .remove(mesh_property.gpu_mesh_alignment);
        }
        if mesh_property.gpu_memory.directional_light > 0.0 {
            ENGINE
                .gpu
                .lock()
                .unwrap()
                .as_mut()
                .unwrap()
                .directional_lights
                .remove(mesh_property.gpu_mesh_alignment);
        }
        #[cfg(feature = "webgpu")]
        {
            ENGINE
                .engine2
                .lock()
                .unwrap()
                .gpu_allocated
                .remove(mesh_property.gpu_mesh_alignment)
        }
    }
}
