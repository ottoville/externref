use core::panic;
use std::num::NonZeroUsize;

pub use crate::drawable::DrawCommand;
use crate::engine::js_error;
#[cfg(target_arch = "wasm32")]
use crate::engine::verticesChange;
pub use crate::engine::Engine;
use crate::engine::Engine2;
pub use crate::engine::ENGINE;
pub use crate::geometry::ColliderPlane;
pub use crate::geometry::Geometry;
pub use crate::geometry::Plane;
use crate::math2::Mat3wgslF32;
use crate::math2::Vec3wgslF32;
pub use crate::GPUMesh;
use crate::MULTIVALUE_F32;
use crate::MULTIVALUE_USIZE;
use rapier3d::prelude::*;
use terramath::MatrixMath;
use terramath::Quaternion;

pub struct Mesh {
    pub id: usize,
    pub gpu_mesh_alignment: std::num::NonZeroUsize, //Alignment in engine.gpu_meshes2 vector,
    transformation: [[f32; 4]; 4],
    pub transformation_is_dirty: bool,
    pub translation: Vec3wgslF32,
    pub rotation: Quaternion,
    pub geometry: Option<Box<Geometry>>,
    pub color: [f32; 4],
    /**
     Force only this amount of positions to be drawn.
     If not set, use vertexbuffer length by default
     Hox: This is NOT amount of indices
    */
    pub positions_count: Option<usize>,
    pub draw_command: Option<DrawCommand>,
    pub rigid_body_handle: Option<RigidBodyHandle>,
    collider_handle: Option<ColliderHandle>,
    pub label: String,
    velocity: [f32; 4],
    drawable: Option<DrawCommand>,
}
#[no_mangle]
pub unsafe extern "C" fn new_mesh(
    point_light: f32,
    directional_light: f32,
    scenes: f32,
    rigid_body: u32,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> usize {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    return Mesh::new(point_light, directional_light, scenes, rigid_body, label);
}
#[no_mangle]
pub extern "C" fn create_geometry<'frame>(
    has_bounding: bool,
    character_can_collide_to: bool,
    static_faces: bool,
    strip: bool,
) -> *mut Geometry {
    let geometry = Box::new(Geometry::new(
        has_bounding,
        character_can_collide_to,
        static_faces,
        strip,
        "unnamed geometry".to_string(),
    ));
    Box::into_raw(geometry)
}
#[no_mangle]
pub unsafe extern "C" fn set_geometry<'frame>(mesh_id: usize, geometry: *mut Geometry) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    mesh.geometry = Some(Box::from_raw(geometry));
}
#[no_mangle]
pub unsafe extern "C" fn add_collider(mesh_id: usize, collider: *const Collider) {
    let coll = std::ptr::read(collider);
    get_mesh_by_id_mut(mesh_id).add_collider(coll, ENGINE.physic_engine_mut());
}
#[no_mangle]
pub unsafe extern "C" fn last_collider_world_vertices_pointer(mesh_id: usize) -> *const f32 {
    get_mesh_by_id(mesh_id)
        .get_geometry()
        .last_collider_world_vertices
        .as_ptr()
}

#[no_mangle]
pub unsafe extern "C" fn faces_count(mesh_id: usize) -> usize {
    get_mesh_by_id(mesh_id).get_geometry().faces_count()
}
#[no_mangle]
pub unsafe extern "C" fn update_scale(mesh_id: usize, x: f32, y: f32, z: f32, skip_normals: bool) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    let geometry = mesh.get_geometry_mut();
    geometry.scaling[0] = x;
    geometry.scaling[1] = y;
    geometry.scaling[2] = z;

    // If not equally to scale into all dimensions, re-calculate normals
    if !skip_normals && (x != y || x != z) {
        mesh.calculate_normals();
    }
    mesh.on_update(true);
}
#[no_mangle]
pub unsafe extern "C" fn calculate_normals(mesh_id: usize) {
    get_mesh_by_id_mut(mesh_id).calculate_normals();
}
#[no_mangle]
pub unsafe extern "C" fn update_dynamic_buffer(mesh_id: usize) {
    get_mesh_by_id(mesh_id).update_dynamic_buffer();
}
#[no_mangle]
pub unsafe extern "C" fn have_rigid_body(mesh_id: usize) -> bool {
    get_mesh_by_id(mesh_id).rigid_body_handle.is_some()
}
#[no_mangle]
pub unsafe extern "C" fn update_euler_angles(mesh_id: usize, x: f32, y: f32, z: f32) {
    let mesh: &mut Mesh = get_mesh_by_id_mut(mesh_id);
    mesh.rotation = Quaternion::from_euler(&[x, y, z]);
    mesh.on_update(true);
}
#[no_mangle]
pub unsafe extern "C" fn update_rotation(mesh_id: usize, x: f32, y: f32, z: f32, w: f32) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    mesh.rotation.i = x;
    mesh.rotation.j = y;
    mesh.rotation.k = z;
    mesh.rotation.w = w;
    mesh.on_update(true);
}
#[no_mangle]
pub unsafe extern "C" fn update_translation(mesh_id: usize, x: f32, y: f32, z: f32) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    // No onupdate is called here because it is called inside set_translation.
    mesh.set_translation(x, y, z);
}
#[no_mangle]
pub unsafe extern "C" fn apply_impulse(mesh_id: usize, x: f32, y: f32, z: f32) {
    get_mesh_by_id_mut(mesh_id).apply_impulse(x, y, z)
}
#[no_mangle]
pub unsafe extern "C" fn label_field_pointer(mesh_id: usize) -> *const usize {
    let label = &get_mesh_by_id(mesh_id).label;
    MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = label.len();
    MULTIVALUE_USIZE[2] = label.capacity();
    MULTIVALUE_USIZE.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn gpu_alignment(mesh_id: usize) -> NonZeroUsize {
    get_mesh_by_id(mesh_id).gpu_mesh_alignment
}
#[no_mangle]
pub unsafe extern "C" fn positions_count(mesh_id: usize) -> usize {
    get_mesh_by_id(mesh_id).get_positions_count()
}
#[no_mangle]
pub unsafe extern "C" fn set_positions_count(mesh_id: usize, positions_count: usize) {
    get_mesh_by_id_mut(mesh_id).positions_count = Some(positions_count);
}
#[no_mangle]
pub extern "C" fn get_mesh_by_id<'frame>(mesh_id: usize) -> &'frame Mesh {
    unsafe {
        let engine2 = ENGINE.physic_engine();
        &engine2.meshes[mesh_id]
    }
}
pub fn get_mesh_by_id_mut<'frame>(mesh_id: usize) -> &'frame mut Mesh {
    unsafe {
        let engine2 = ENGINE.physic_engine_mut();
        &mut engine2.meshes[mesh_id]
    }
}
#[no_mangle]
pub unsafe extern "C" fn strip(mesh_id: usize) -> bool {
    get_mesh_by_id(mesh_id).get_geometry().strip
}
#[no_mangle]
pub unsafe extern "C" fn collider_planes_parallel_pointer(mesh_id: usize) -> *const [f32; 4] {
    get_mesh_by_id(mesh_id)
        .get_geometry()
        .collider_planes_parallel
        .as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn gpu_pointer(mesh_id: usize) -> *const [[f32; 4]; 4] {
    let engine2 = ENGINE.physic_engine();
    &engine2.gpu_meshes[get_mesh_by_id(mesh_id).gpu_mesh_alignment].transformation
}
#[no_mangle]
pub unsafe extern "C" fn translation_pointer(mesh_id: usize) -> *const Vec3wgslF32 {
    &get_mesh_by_id(mesh_id).translation
}
#[no_mangle]
pub unsafe extern "C" fn rotation_pointer(mesh_id: usize) -> *const Quaternion {
    &(get_mesh_by_id(mesh_id).rotation)
}
#[no_mangle]
pub unsafe extern "C" fn scale_pointer(mesh_id: usize) -> *const [f32; 3] {
    &get_mesh_by_id(mesh_id).get_geometry().scaling
}
#[no_mangle]
pub unsafe extern "C" fn rotation_pointer_euler(mesh_id: usize) -> *const f32 {
    let mut euler = [0.0, 0.0, 0.0];
    get_mesh_by_id(mesh_id).rotation.to_euler_angles(&mut euler);
    MULTIVALUE_F32[0] = euler[0];
    MULTIVALUE_F32[1] = euler[1];
    MULTIVALUE_F32[2] = euler[2];
    return MULTIVALUE_F32.as_ptr();
}
#[no_mangle]
pub unsafe extern "C" fn velocity_pointer(mesh_id: usize) -> *const [f32; 4] {
    &(get_mesh_by_id(mesh_id).velocity)
}
#[no_mangle]
pub unsafe extern "C" fn intersect_box_aa_sphere(
    mesh_id: usize,
    collider: *const crate::collider::Collider,
    radius: f32,
) -> bool {
    get_mesh_by_id_mut(mesh_id).intersect_box_aa_sphere(&(*collider), radius)
}
#[no_mangle]
pub unsafe extern "C" fn create_trimesh_collider(mesh_id: usize) -> *mut Collider {
    get_mesh_by_id_mut(mesh_id)
        .get_geometry_mut()
        .create_trimesh_collider()
}
#[no_mangle]
pub unsafe extern "C" fn create_convex_collider(
    mesh_id: usize,
    collision_events: bool,
) -> *mut Collider {
    get_mesh_by_id_mut(mesh_id)
        .get_geometry_mut()
        .create_convex_collider(collision_events)
}

#[no_mangle]
pub unsafe extern "C" fn scale_x(mesh_id: usize) -> f32 {
    get_mesh_by_id(mesh_id).get_geometry().scaling[0]
}
#[no_mangle]
pub unsafe extern "C" fn scale_y(mesh_id: usize) -> f32 {
    get_mesh_by_id(mesh_id).get_geometry().scaling[1]
}
#[no_mangle]
pub unsafe extern "C" fn scale_z(mesh_id: usize) -> f32 {
    get_mesh_by_id(mesh_id).get_geometry().scaling[2]
}
#[no_mangle]
pub unsafe extern "C" fn vertices_stride(geometry: *const Geometry) -> usize {
    (*geometry).vertices.vertices_stride
}
#[no_mangle]
pub unsafe extern "C" fn set_color(
    mesh_id: usize,
    data_0: f32,
    data_1: f32,
    data_2: f32,
    data_3: f32,
) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    mesh.color[0] = data_0;
    mesh.color[1] = data_1;
    mesh.color[2] = data_2;
    mesh.color[3] = data_3;
    mesh.on_update(false);
}
#[no_mangle]
pub unsafe extern "C" fn set_ambient(
    mesh_id: usize,
    ambient_r: f32,
    ambient_g: f32,
    ambient_b: f32,
) {
    let engine2 = ENGINE.physic_engine_mut();
    let gpu_mesh = &mut engine2.gpu_meshes[get_mesh_by_id(mesh_id).gpu_mesh_alignment];
    gpu_mesh.ambient[0] = ambient_r;
    gpu_mesh.ambient[1] = ambient_g;
    gpu_mesh.ambient[2] = ambient_b;
}
#[no_mangle]
pub unsafe extern "C" fn set_shadow(mesh_id: usize, shadow: f32) {
    let engine2 = ENGINE.physic_engine_mut();
    let gpu_mesh = &mut engine2.gpu_meshes[get_mesh_by_id(mesh_id).gpu_mesh_alignment];
    gpu_mesh.shadow = shadow;
}

#[no_mangle]
pub unsafe extern "C" fn collider_faces_pointer(mesh_id: usize) -> *const ColliderPlane {
    get_mesh_by_id(mesh_id)
        .get_geometry()
        .collider_planes
        .as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn set_scenes(mesh_id: usize, scenes: u32) {
    let engine2 = ENGINE.physic_engine_mut();
    let mesh = get_mesh_by_id(mesh_id);
    let gpu_mesh = &mut engine2.gpu_meshes[mesh.gpu_mesh_alignment];

    gpu_mesh.scenes = scenes;
    mesh.update_dynamic_buffer();
}
#[no_mangle]
pub unsafe extern "C" fn update_scale_and_rotation(
    mesh_id: usize,
    x: f32,
    y: f32,
    z: f32,
    rx: f32,
    ry: f32,
    rz: f32,
    rw: f32,
) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    let geometry = mesh.get_geometry_mut();
    geometry.scaling[0] = x;
    geometry.scaling[1] = y;
    geometry.scaling[2] = z;
    mesh.rotation.i = rx;
    mesh.rotation.j = ry;
    mesh.rotation.k = rz;
    mesh.rotation.w = rw;
    mesh.on_update(true);
}
#[no_mangle]
pub unsafe extern "C" fn faces_pointer(mesh_id: usize) -> *const Plane {
    let geometry = get_mesh_by_id(mesh_id).get_geometry();
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
    pub fn get_transformation(&mut self) -> &[[f32; 4]; 4] {
        if self.transformation_is_dirty {
            self.update_matrix();
        }
        return &self.transformation;
    }
    pub unsafe fn add_collider<'a>(
        &'static mut self,
        collider: Collider,
        engine2: &'static mut Engine2,
    ) {
        match self.rigid_body_handle {
            Some(rigid_body_handle) => {
                let old = self
                    .collider_handle
                    .replace(engine2.collider_set.insert_with_parent(
                        collider,
                        rigid_body_handle,
                        &mut engine2.rigid_body_set,
                    ));
                match old {
                    Some(handle) => {
                        engine2.collider_set.remove(
                            handle,
                            &mut engine2.island_manager,
                            &mut engine2.rigid_body_set,
                            true,
                        );
                    }
                    _ => (),
                };
            }
            None => {
                self.collider_handle
                    .replace(engine2.collider_set.insert(collider));
            }
        }
    }

    pub unsafe fn new<'a>(
        point_light: f32,
        directional_light: f32,
        scenes: f32,
        rigid_body: u32, //0: no rigid body, 1: normal rigid body, 2: fixed rigid body
        label: String,
    ) -> usize {
        let engine2 = ENGINE.physic_engine_mut();
        let id = engine2.meshes.len();
        let idx = engine2.gpu_meshes.add(GPUMesh {
            transformation: MatrixMath::identity(),
            transformation_normals: Mat3wgslF32::identity(),
            ambient: [0.0, 0.0, 0.0],
            shadow: 0.0,
            color: [0.0, 0.0, 0.0, 0.0],
            spotlight: [0.0, 0.0, 0.0, 0.0],
            _id: id,
            point_light_squared: point_light * point_light,
            directional_light,
            scenes: scenes as u32,
        });
        let m = Mesh {
            id,
            gpu_mesh_alignment: idx,
            geometry: None,
            velocity: [0.0, 0.0, 0.0, 0.0],
            transformation: MatrixMath::identity(),
            transformation_is_dirty: true,
            translation: Vec3wgslF32::new(),
            rotation: Quaternion {
                i: 0.0,
                j: 0.0,
                k: 0.0,
                w: 1.0,
            },
            color: [1.0, 0.0, 0.0, 0.0],
            positions_count: Option::None,
            draw_command: Option::None,
            rigid_body_handle: None,
            collider_handle: None,
            label,
            drawable: Option::None,
        };
        if point_light > 0.0 {
            ENGINE.point_lights.push(m.gpu_mesh_alignment);
            #[cfg(feature = "webgpu")]
            ENGINE.update_point_lights();
        }
        if directional_light > 0.0 {
            ENGINE.directional_lights.push(m.gpu_mesh_alignment);
            #[cfg(feature = "webgpu")]
            ENGINE.update_directional_lights();
        }

        engine2.meshes.push(m);
        engine2.meshes[id].update_dynamic_buffer();
        if rigid_body > 0 {
            let rigid_body_builder: RigidBodyBuilder;
            if rigid_body == 2 {
                rigid_body_builder = RigidBodyBuilder::fixed().ccd_enabled(true);
            } else {
                rigid_body_builder = RigidBodyBuilder::dynamic().sleeping(true).ccd_enabled(true);
            }
            let rigid_body = rigid_body_builder.build();
            let rigid_body_handle = engine2.rigid_body_set.insert(rigid_body);
            engine2.meshes[id].rigid_body_handle = Some(rigid_body_handle);
            engine2.rigid_bodies.insert(rigid_body_handle, id);
        }
        return id;
    }
    pub fn get_geometry(&self) -> &Geometry {
        if let Some(g) = &self.geometry {
            g
        } else {
            js_error([&format!("Mesh {} has no geometry", self.label)]);
            panic!("Mesh has no geometry")
        }
    }
    pub fn get_geometry_mut(&mut self) -> &mut Geometry {
        if let Some(g) = &mut self.geometry {
            g
        } else {
            js_error([&format!("Mesh {} has no geometry", self.label)]);
            panic!("Mesh has no geometry")
        }
    }
    pub unsafe fn set_translation(&mut self, x: f32, y: f32, z: f32) {
        self.update_translation(x, y, z);
        match self.rigid_body_handle {
            Some(rigid_body_handle) => {
                let e = ENGINE.physic_engine_mut();
                let rigid_body = e.rigid_body_set.get_mut(rigid_body_handle);
                match rigid_body {
                    Some(rigid_body) => rigid_body.set_translation(vector![x, y, z], true),
                    None => panic!("Rigid body not found"),
                };
            }
            _ => {}
        }
    }
    pub fn update_translation(&mut self, x: f32, y: f32, z: f32) {
        self.translation.vec = [x, y, z];
        self.on_update(true);
    }
    pub unsafe fn apply_impulse(&mut self, x: f32, y: f32, z: f32) {
        let e = ENGINE.physic_engine_mut();
        match self.rigid_body_handle {
            Some(rigid_body_handle) => {
                let rigid_body = e.rigid_body_set.get_mut(rigid_body_handle);
                match rigid_body {
                    Some(rigid_body) => rigid_body.apply_impulse(vector![x, y, z], true),
                    None => panic!("Rigid body not found"),
                };
            }
            _ => {}
        }
    }
    pub unsafe fn update_dynamic_buffer(&self) {
        let engine2 = ENGINE.physic_engine_mut();
        engine2.gpu_queue.insert(self.id);
    }
    /**
     * To be called when mesh property change
     *  param physics: If change affects physics, set true when translation, rotation or scale changes.
     */
    pub fn on_update(&mut self, physics: bool) {
        unsafe {
            self.update_dynamic_buffer();
        }
        self.transformation_is_dirty = true;
        if physics {
            if let Some(rigid_body_handle) = self.rigid_body_handle {
                let e = unsafe { ENGINE.physic_engine_mut() };
                let rigid_body = e.rigid_body_set.get_mut(rigid_body_handle);
                match rigid_body {
                    Some(rigid_body) => {
                        rigid_body.set_translation(
                            vector![
                                self.translation.vec[0],
                                self.translation.vec[1],
                                self.translation.vec[2]
                            ],
                            true,
                        );
                        rigid_body.set_rotation(
                            nalgebra::Unit::from_quaternion(nalgebra::Quaternion::new(
                                self.rotation.w,
                                self.rotation.i,
                                self.rotation.j,
                                self.rotation.k,
                            )),
                            true,
                        )
                    }
                    None => panic!("Rigid body not found"),
                };
            }
            if let Some(geometry) = &mut self.geometry {
                if geometry.bounding_box.has_bounding {
                    geometry.bounding_box.dirty = true;
                }
            }
        }
    }

    pub fn set_scale_x(&mut self, x: f32) {
        self.get_geometry_mut().scaling[0] = x;
        self.on_update(true);
    }
    pub fn set_scale_y(&mut self, y: f32) {
        self.get_geometry_mut().scaling[1] = y;
        self.on_update(true);
    }

    pub fn set_scale_z(&mut self, z: f32) {
        self.get_geometry_mut().scaling[2] = z;
        self.on_update(true);
    }
    pub unsafe fn set_point_light(&mut self, engine: &'static mut Engine, range: f32) {
        let engine2 = ENGINE.physic_engine_mut();
        let gpu_mesh = &mut engine2.gpu_meshes[self.gpu_mesh_alignment];
        gpu_mesh.set_point_light(engine, range, self.gpu_mesh_alignment);
    }
    pub unsafe fn set_directional_light(&mut self, engine: &'static mut Engine, range: f32) {
        let engine2 = ENGINE.physic_engine_mut();
        let gpu_mesh = &mut engine2.gpu_meshes[self.gpu_mesh_alignment];
        gpu_mesh.set_directional_light(engine, range, self.gpu_mesh_alignment);
    }
    pub fn update_matrix(&mut self) {
        let x: f32 = self.rotation.i;
        let y: f32 = self.rotation.j;
        let z: f32 = self.rotation.k;
        let w: f32 = self.rotation.w;

        let x2: f32 = x + x;
        let y2: f32 = y + y;
        let z2: f32 = z + z;

        let xx: f32 = x * x2;
        let xy: f32 = x * y2;
        let xz: f32 = x * z2;

        let yy: f32 = y * y2;
        let yz: f32 = y * z2;
        let zz: f32 = z * z2;
        let wx: f32 = w * x2;
        let wy: f32 = w * y2;
        let wz: f32 = w * z2;


        self.transformation[0][0] = 1.0 - (yy + zz);
        self.transformation[0][1] = xy + wz;
        self.transformation[0][2] = xz - wy;

        self.transformation[1][0] = xy - wz;
        self.transformation[1][1] = 1.0 - (xx + zz);
        self.transformation[1][2] = yz + wx;

        self.transformation[2][0] = xz + wy;
        self.transformation[2][1] = yz - wx;
        self.transformation[2][2] = 1.0 - (xx + yy);
        if let Some(geometry) = &self.geometry {  
            let sx = geometry.scaling[0];
            let sy = geometry.scaling[1];
            let sz = geometry.scaling[2];
            self.transformation[0][0] *= sx;
            self.transformation[0][1] *= sx;
            self.transformation[0][2] *= sx;
    
            self.transformation[1][0] *= sy;
            self.transformation[1][1] *= sy;
            self.transformation[1][2] *= sy;
    
            self.transformation[2][0] *= sz;
            self.transformation[2][1] *= sz;
            self.transformation[2][2] *= sz;
        }

        self.transformation[3][0] = self.translation.vec[0];
        self.transformation[3][1] = self.translation.vec[1];
        self.transformation[3][2] = self.translation.vec[2];
        unsafe {
            let engine2 = ENGINE.physic_engine_mut();
            let gpu_mesh = &mut engine2.gpu_meshes[self.gpu_mesh_alignment];
            gpu_mesh.color[0] = self.color[0];
            gpu_mesh.color[1] = self.color[1];
            gpu_mesh.color[2] = self.color[2];
            gpu_mesh.color[3] = self.color[3];
            gpu_mesh.transformation = self.transformation;
        }
        self.transformation_is_dirty = false;
    }
    pub unsafe fn intersect_box_aa_sphere(
        &mut self,
        collider: &crate::collider::Collider,
        radius: f32,
    ) -> bool {
        let mesh = get_mesh_by_id_mut(self.id);
        let g = self.get_geometry_mut();
        g.update_bounding_box(&mesh.get_transformation());
        self.get_geometry_mut()
            .bounding_box
            .intersect_box_aa_sphere(collider, radius)
    }
    pub fn calculate_normals(&mut self) {
        self.get_geometry_mut().calculate_normals();
        #[cfg(target_arch = "wasm32")]
        unsafe {
            verticesChange(self.id);
        }
    }
}
impl Drop for Mesh {
    fn drop(&mut self) {
        unsafe {
            let engine2 = ENGINE.physic_engine_mut();
            let gpu_mesh = &engine2.gpu_meshes[self.gpu_mesh_alignment];
            if gpu_mesh.point_light_squared > 0.0 {
                let index = ENGINE
                    .point_lights
                    .iter()
                    .position(|x| *x == self.gpu_mesh_alignment)
                    .unwrap();
                ENGINE.point_lights.swap_remove(index);
                #[cfg(feature = "webgpu")]
                ENGINE.update_point_lights();
            }
            if gpu_mesh.directional_light > 0.0 {
                let index = ENGINE
                    .directional_lights
                    .iter()
                    .position(|x| *x == self.gpu_mesh_alignment)
                    .unwrap();
                ENGINE.directional_lights.swap_remove(index);
                #[cfg(feature = "webgpu")]
                ENGINE.update_directional_lights();
            }
            #[cfg(feature = "webgpu")]
            engine2.gpu_meshes.remove(self.gpu_mesh_alignment)
        }
    }
}
