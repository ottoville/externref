use core::panic;

pub use crate::boundingbox::BoundingBox;
pub use crate::drawable::DrawCommand;
pub use crate::drawable::DrawType;
pub use crate::engine::Engine;
use crate::engine::Engine2;
pub use crate::engine::ENGINE;
pub use crate::geometry::ColliderPlane;
pub use crate::geometry::Geometry;
pub use crate::geometry::Plane;
use crate::math2::Quaternion;
use crate::math2::Vec3;
use crate::math2::Vec4;
pub use crate::terrain::elevator::Elevator;
pub use crate::GPUMesh;
use rapier3d::prelude::*;

pub struct Mesh {
    pub id: usize,
    pub gpu_alignment: u32, //Alignment in GPU memory. Real alignment is 256 + gpu_alignment because first block is used for indexing
    pub gpu_mesh_alignment: usize, //Alignment in engine.gpu_meshes vector
    pub rotation: Quaternion,
    pub scaling: Vec3<f32>,
    pub geometry: Option<Geometry>,
    pub positions_count: usize,
    pub strip: bool,
    pub draw_command: Option<DrawCommand>,
    pub rigid_body_handle: Option<RigidBodyHandle>,
    collider_handle: Option<ColliderHandle>,
    pub label: String,
    velocity: [f32; 4],
    drawable: Option<DrawCommand>
}
#[no_mangle]
pub unsafe extern "C" fn new_mesh(
    positions_count: usize,
    point_light: f32,
    directional_light: f32,
    scenes: f32,
    strip: bool,
    fixed: bool,
    rigid_body: bool,
    label: *mut std::os::raw::c_char,
    matrix_modifier: Option<*const Vec4<Vec4<f32>>>,
) -> usize {
    let cstr = std::ffi::CString::from_raw(label);
    match cstr.to_str() {
        Ok(str) => {
            return Mesh::new(
                positions_count,
                point_light,
                directional_light,
                scenes,
                strip,
                fixed,
                rigid_body,
                str.to_string(),
            );
        }
        Err(error) => {
            panic!("{}", &error.to_string());
        }
    }
}
#[no_mangle]
pub unsafe extern "C" fn create_geometry(
    mesh_id: usize,
    has_bounding: bool,
    vertices_stride: usize,
    static_faces: bool,
    strip: bool,
) {
    get_mesh_by_id_mut(mesh_id).create_geometry(has_bounding, vertices_stride, static_faces, strip);
}
#[no_mangle]
pub unsafe extern "C" fn add_collider(mesh_id: usize, collider: *const Collider) {
    let coll = std::ptr::read(collider);
    get_mesh_by_id_mut(mesh_id).add_collider(coll, ENGINE.physic_engine_mut());
}
#[no_mangle]
pub unsafe extern "C" fn set_vertices(mesh_id: usize, ptr: *mut f32, length: usize) {
    let vertices = Vec::from_raw_parts(ptr, length, length);
    get_mesh_by_id_mut(mesh_id)
        .get_geometry_mut()
        .set_vertices(vertices);
}
#[no_mangle]
pub unsafe extern "C" fn set_indices(mesh_id: usize, ptr: *mut usize, length: usize) {
    let indices = Vec::from_raw_parts(ptr, length, length);
    let geometry = get_mesh_by_id_mut(mesh_id).get_geometry_mut();
    geometry.set_indices(indices);
}
#[no_mangle]
pub unsafe extern "C" fn set_indices_and_vertices(
    mesh_id: usize,
    indices_ptr: *mut usize,
    indices_length: usize,
    vertices_ptr: *mut f32,
    vertices_length: usize,
) {
    let indices = Vec::from_raw_parts(indices_ptr, indices_length, indices_length);
    let vertices = Vec::from_raw_parts(vertices_ptr, vertices_length, vertices_length);
    let geometry = get_mesh_by_id_mut(mesh_id).get_geometry_mut();
    geometry.indices = indices;
    geometry.set_vertices(vertices);
}
#[no_mangle]
pub unsafe extern "C" fn vertices_pointer(mesh_id: usize) -> *const f32 {
    get_mesh_by_id(mesh_id).get_geometry().vertices.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn last_collider_world_vertices_pointer(mesh_id: usize) -> *const f32 {
    get_mesh_by_id(mesh_id)
        .get_geometry()
        .last_collider_world_vertices
        .as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn vertices_count(mesh_id: usize) -> usize {
    let mesh = get_mesh_by_id(mesh_id);
    mesh.get_geometry().vertices.len() / mesh.get_geometry().vertices_stride
}
#[no_mangle]
pub unsafe extern "C" fn faces_count(mesh_id: usize) -> usize {
    get_mesh_by_id(mesh_id).get_geometry().faces_count()
}
#[no_mangle]
pub unsafe extern "C" fn update_scale(mesh_id: usize, x: f32, y: f32, z: f32) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    mesh.scaling.x = x;
    mesh.scaling.y = y;
    mesh.scaling.z = z;
    mesh.on_update();
}
#[no_mangle]
pub unsafe extern "C" fn update_dynamic_buffer(mesh_id: usize) {
    get_mesh_by_id(mesh_id).update_dynamic_buffer();
}
#[no_mangle]
pub unsafe extern "C" fn update_euler_angles(mesh_id: usize, x: f32, y: f32, z: f32) {
    // Produces a quaternion from Euler angles in the z-y-x orientation (Tait-Bryan angles)
    // TODO: utilize SIMD
    let half_roll = z * 0.5;
    let half_pitch = x * 0.5;
    let half_yaw = y * 0.5;

    let sin_roll = half_roll.sin();
    let cos_roll = half_roll.cos();
    let sin_pitch = half_pitch.sin();
    let cos_pitch = half_pitch.cos();
    let sin_yaw = half_yaw.sin();
    let cos_yaw = half_yaw.cos();
    let mesh = get_mesh_by_id_mut(mesh_id);
    mesh.rotation.i = (cos_yaw * sin_pitch * cos_roll) + (sin_yaw * cos_pitch * sin_roll);
    mesh.rotation.j = (sin_yaw * cos_pitch * cos_roll) - (cos_yaw * sin_pitch * sin_roll);
    mesh.rotation.k = (cos_yaw * cos_pitch * sin_roll) - (sin_yaw * sin_pitch * cos_roll);
    mesh.rotation.w = (cos_yaw * cos_pitch * cos_roll) + (sin_yaw * sin_pitch * sin_roll);
    mesh.on_update();
}
#[no_mangle]
pub unsafe extern "C" fn update_rotation(mesh_id: usize, x: f32, y: f32, z: f32, w: f32) {
    let mesh = get_mesh_by_id_mut(mesh_id);
    mesh.rotation.i = x;
    mesh.rotation.j = y;
    mesh.rotation.k = z;
    mesh.rotation.w = w;
    mesh.on_update();
}
#[no_mangle]
pub unsafe extern "C" fn update_translation(mesh_id: usize, x: f32, y: f32, z: f32) {
    get_mesh_by_id_mut(mesh_id).set_translation(x, y, z)
}
#[no_mangle]
pub unsafe extern "C" fn apply_impulse(mesh_id: usize, x: f32, y: f32, z: f32) {
    get_mesh_by_id_mut(mesh_id).apply_impulse(x, y, z)
}
#[no_mangle]
pub unsafe extern "C" fn label_field_pointer(mesh_id: usize) -> *const String {
    std::ptr::addr_of!(get_mesh_by_id(mesh_id).label)
}
#[no_mangle]
pub unsafe extern "C" fn indices_field_pointer(mesh_id: usize) -> *const Vec<usize> {
    std::ptr::addr_of!(get_mesh_by_id(mesh_id).get_geometry().indices)
}
#[no_mangle]
pub unsafe extern "C" fn gpu_alignment(mesh_id: usize) -> u32 {
    get_mesh_by_id(mesh_id).gpu_alignment
}
#[no_mangle]
pub unsafe extern "C" fn positions_count(mesh_id: usize) -> usize {
    get_mesh_by_id(mesh_id).positions_count
}
#[no_mangle]
pub unsafe extern "C" fn set_positions_count(mesh_id: usize, positions_count: usize) {
    get_mesh_by_id_mut(mesh_id).positions_count = positions_count;
}
#[no_mangle]
pub unsafe extern "C" fn get_mesh_by_id<'frame>(mesh_id: usize) -> &'frame Mesh {
    let engine2 = ENGINE.physic_engine();
    &engine2.meshes[mesh_id]
}
pub fn get_mesh_by_id_mut<'frame>(mesh_id: usize) -> &'frame mut Mesh {
    unsafe {
        let engine2 = ENGINE.physic_engine_mut();
        &mut engine2.meshes[mesh_id]
    }
}
#[no_mangle]
pub unsafe extern "C" fn strip(mesh_id: usize) -> bool {
    get_mesh_by_id(mesh_id).strip
}
#[no_mangle]
pub unsafe extern "C" fn collider_planes_parallel_pointer(mesh_id: usize) -> *const [f32; 4] {
    get_mesh_by_id(mesh_id)
        .get_geometry()
        .collider_planes_parallel
        .as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn gpu_pointer(mesh_id: usize) -> *const Vec4<Vec4<f32>> {
    let engine2 = ENGINE.physic_engine();
    &engine2.gpu_meshes[get_mesh_by_id(mesh_id).gpu_mesh_alignment].transformation
}
#[no_mangle]
pub unsafe extern "C" fn translation_pointer(mesh_id: usize) -> *const Vec4<f32> {
    let engine2 = ENGINE.physic_engine();
    &engine2.gpu_meshes[get_mesh_by_id(mesh_id).gpu_mesh_alignment]
        .transformation
        .w
}
#[no_mangle]
pub unsafe extern "C" fn rotation_pointer(mesh_id: usize) -> *const crate::math2::Quaternion {
    &(get_mesh_by_id(mesh_id).rotation)
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
    get_mesh_by_id(mesh_id).create_trimesh_collider()
}

#[no_mangle]
pub unsafe extern "C" fn scale_x(mesh_id: usize) -> f32 {
    get_mesh_by_id(mesh_id).scaling.x
}
#[no_mangle]
pub unsafe extern "C" fn scale_y(mesh_id: usize) -> f32 {
    get_mesh_by_id(mesh_id).scaling.y
}
#[no_mangle]
pub unsafe extern "C" fn scale_z(mesh_id: usize) -> f32 {
    get_mesh_by_id(mesh_id).scaling.z
}
#[no_mangle]
pub unsafe extern "C" fn vertices_stride(mesh_id: usize) -> usize {
    get_mesh_by_id(mesh_id).get_geometry().vertices_stride
}
#[no_mangle]
pub unsafe extern "C" fn set_faces(mesh_id: usize, ptr: *mut Plane, length: usize) {
    let planes = Vec::from_raw_parts(ptr, length / 4, length / 4);
    let geometry = get_mesh_by_id_mut(mesh_id).get_geometry_mut();
    geometry.collider_planes = Vec::with_capacity(planes.len());
    geometry.collider_planes_parallel = Vec::with_capacity(planes.len());
    geometry.faces.planes = planes;
}
#[no_mangle]
pub unsafe extern "C" fn set_color(
    mesh_id: usize,
    data_0: f32,
    data_1: f32,
    data_2: f32,
    data_3: f32,
) {
    let engine2 = ENGINE.physic_engine_mut();
    let gpu_mesh = &mut engine2.gpu_meshes[get_mesh_by_id(mesh_id).gpu_mesh_alignment];

    gpu_mesh.color[0] = data_0;
    gpu_mesh.color[1] = data_1;
    gpu_mesh.color[2] = data_2;
    gpu_mesh.color[3] = data_3;
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
    mesh.scaling.x = x;
    mesh.scaling.y = y;
    mesh.scaling.z = z;
    mesh.rotation.i = rx;
    mesh.rotation.j = ry;
    mesh.rotation.k = rz;
    mesh.rotation.w = rw;
    mesh.on_update();
}
#[no_mangle]
pub unsafe extern "C" fn faces_pointer(mesh_id: usize) -> *const Plane {
    let geometry = get_mesh_by_id(mesh_id).get_geometry();
    if !geometry.static_faces && geometry.faces.planes.len() == 0 {
        panic!("Not implemented yet, TODO: Generate faces");
        //Remember to allocate memory for collider planes also and other collider stuff also
    }
    return geometry.faces.planes.as_ptr();
}
#[no_mangle]
pub unsafe extern "C" fn bounding_vectors_pointer_simd(mesh_id: usize) -> *const Vec3<Vec4<f32>> {
    let engine2 = ENGINE.physic_engine();
    let mesh = get_mesh_by_id_mut(mesh_id);
    let gpu_mesh = &engine2.gpu_meshes[mesh.gpu_mesh_alignment];
    let geometry = mesh.get_geometry_mut();
    geometry.update_bounding_box(&gpu_mesh.transformation);
    (&geometry.bounding_box.vectors_simd) as *const Vec3<Vec4<f32>>
}
impl Mesh {
    pub fn draw(&self) -> *const usize {
        &self.draw_command as *const _ as *const usize
    }
}

impl Mesh {
    //TODO: move to geometry
    pub fn create_trimesh_collider(&self) -> *mut Collider {
        let geometry = self.get_geometry();
        let iterator = geometry
            .vertices
            .chunks(geometry.vertices_stride);
        let mut vertices: Vec<Point<Real>> = Vec::with_capacity(self.positions_count);
        iterator.for_each(|i| {
            // TODO: ensure simd
            vertices.push(Point::new(
                i[0] * self.scaling.x,
                i[1] * self.scaling.y,
                i[2] * self.scaling.z,
            ));
        });
        let mut indices: Vec<[u32; 3]>;
        if geometry.indices.len() == 0 {
            if self.strip {
                panic!("Unindexed Trimesh collider with triangle strip is not yet supported");
            }
            indices = Vec::with_capacity(self.positions_count);
            let mut pos = 0;
            while pos < self.positions_count {
                indices.push([pos as u32, pos as u32 + 1, pos as u32 + 2]);
                pos = pos + 3;
            }
        } else {
            if self.strip {
                indices = Vec::with_capacity(geometry.indices.len() - 2);
                geometry.indices.windows(3).for_each(|i| {
                    indices.push([i[0] as u32, i[1] as u32, i[2] as u32]);
                });
            } else {
                indices = Vec::with_capacity(geometry.indices.len() / 3);
                geometry.indices.chunks(3).into_iter().for_each(|i| {
                    indices.push([i[0] as u32, i[1] as u32, i[2] as u32]);
                });
            }
        }
        /*  jslog_string(vec!["create_trimesh_collider".to_string(), vertices.len().to_string(), indices.len().to_string() ]);
        jslog_string(vec![format!("{:?}", vertices)]);
        jslog_string(vec![format!("{:?}", indices)]);*/
        let collider = Box::new(
            ColliderBuilder::trimesh(vertices, indices)
                .density(2.0)
                .restitution(0.5)
                .build(),
        );
        Box::leak(collider)
    }
    pub fn create_geometry<'a>(
        &'static mut self,
        has_bounding: bool,
        vertices_stride: usize,
        static_faces: bool,
        strip: bool,
    ) {
        self.geometry = Some(Geometry::new(
            has_bounding,
            vertices_stride,
            static_faces,
            strip,
        ));
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
        positions_count: usize,
        point_light: f32,
        directional_light: f32,
        scenes: f32,
        strip: bool,
        fixed: bool,
        rigid_body: bool,
        label: String,
    ) -> usize {
        let engine2 = ENGINE.physic_engine_mut();
        let id = engine2.meshes.len();
        let m = Mesh {
            id,
            gpu_mesh_alignment: engine2.gpu_meshes.len(),
            gpu_alignment: ENGINE.allocate_gpu(),
            geometry: None,
            velocity: [0.0, 0.0, 0.0, 0.0],
            rotation: Quaternion {
                i: 0.0,
                j: 0.0,
                k: 0.0,
                w: 1.0,
            },
            scaling: Vec3 {
                x: 1.0,
                y: 1.0,
                z: 1.0,
            },
            positions_count,
            strip,
            draw_command: Option::None,
            rigid_body_handle: None,
            collider_handle: None,
            label,
            drawable: Option::None,
        };
        engine2.gpu_meshes.push(GPUMesh {
            transformation: Vec4 {
                x: Vec4 {
                    x: 1.0,
                    y: 0.0,
                    z: 0.0,
                    w: 0.0,
                },
                y: Vec4 {
                    x: 0.0,
                    y: 1.0,
                    z: 0.0,
                    w: 0.0,
                },
                z: Vec4 {
                    x: 0.0,
                    y: 0.0,
                    z: 1.0,
                    w: 0.0,
                },
                w: Vec4 {
                    x: 0.0,
                    y: 0.0,
                    z: 0.0,
                    w: 1.0,
                },
            },
            ambient: [0.0, 0.0, 0.0],
            shadow: 0.0,
            color: [0.0, 0.0, 0.0, 0.0],
            spotlight: [0.0, 0.0, 0.0, 0.0],
            _id: id,
            point_light_squared: point_light * point_light,
            directional_light,
            scenes: scenes as u32,
        });
        if point_light > 0.0 {
            ENGINE.point_lights.push(m.gpu_alignment);
            #[cfg(feature = "webgpu")]
            ENGINE.update_point_lights();
        }
        if directional_light > 0.0 {
            ENGINE.directional_lights.push(m.gpu_alignment);
            #[cfg(feature = "webgpu")]
            ENGINE.update_directional_lights();
        }
        #[cfg(feature = "webgpu")]
        ENGINE.allocated_gpu_memory();

        engine2.meshes.push(m);
        engine2.meshes[id].update_dynamic_buffer();
        if rigid_body {
            let rigid_body_builder: RigidBodyBuilder;
            if fixed {
                rigid_body_builder = RigidBodyBuilder::fixed().ccd_enabled(true);
            } else {
                rigid_body_builder = RigidBodyBuilder::dynamic().sleeping(true).ccd_enabled(true);
            }
            let rigid_body = rigid_body_builder.build();
            let rigid_body_handle = engine2.rigid_body_set.insert(rigid_body);
            engine2.meshes[id].rigid_body_handle = Some(rigid_body_handle);
            engine2
                .rigid_bodies
                .insert(rigid_body_handle, &mut engine2.meshes[id]);
        }
        return id;
    }
    pub fn get_geometry(&self) -> &Geometry {
        if let Some(g) = &self.geometry {
            g
        } else {
            panic!("Mesh has no geometry")
        }
    }
    pub fn get_geometry_mut(&mut self) -> &mut Geometry {
        if let Some(g) = &mut self.geometry {
            g
        } else {
            panic!("Mesh has no geometry")
        }
    }
    pub unsafe fn set_translation(&mut self, x: f32, y: f32, z: f32) {
        self.update_translation(x, y, z);
        let e = ENGINE.physic_engine_mut();
        match self.rigid_body_handle {
            Some(rigid_body_handle) => {
                let rigid_body = e.rigid_body_set.get_mut(rigid_body_handle);
                match rigid_body {
                    Some(rigid_body) => rigid_body.set_translation(vector![x, y, z], true),
                    None => panic!("Rigid body not found"),
                };
            }
            _ => {}
        }
    }
    pub unsafe fn update_translation(&mut self, x: f32, y: f32, z: f32) {
        let engine2 = ENGINE.physic_engine_mut();
        let gpu_mesh = &mut engine2.gpu_meshes[self.gpu_mesh_alignment];

        gpu_mesh.transformation.w.x = x;
        gpu_mesh.transformation.w.y = y;
        gpu_mesh.transformation.w.z = z;
        self.update_dynamic_buffer();
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
        let gpu_mesh = &engine2.gpu_meshes[self.gpu_mesh_alignment];
        engine2.gpu_queue2.insert(self.gpu_mesh_alignment, gpu_mesh);
    }

    pub fn on_update(&mut self) {
        unsafe {
            self.update_matrix();
            self.update_dynamic_buffer();
            let e = ENGINE.physic_engine_mut();
            let gpu_mesh = &mut e.gpu_meshes[self.gpu_mesh_alignment];
            if let Some(rigid_body_handle) = self.rigid_body_handle {
                let rigid_body = e.rigid_body_set.get_mut(rigid_body_handle);
                match rigid_body {
                    Some(rigid_body) => {
                        rigid_body.set_translation(
                            vector![
                                gpu_mesh.transformation.w.x,
                                gpu_mesh.transformation.w.y,
                                gpu_mesh.transformation.w.z
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
        }
        if let Some(geometry) = &mut self.geometry {
            if geometry.bounding_box.has_bounding {
                geometry.bounding_box.dirty = true;
            }
        }
    }

    pub fn set_scale_x(&mut self, x: f32) {
        self.scaling.x = x;
        self.on_update();
    }
    pub fn set_scale_y(&mut self, y: f32) {
        self.scaling.y = y;
        self.on_update();
    }

    pub fn set_scale_z(&mut self, z: f32) {
        self.scaling.z = z;
        self.on_update();
    }
    pub unsafe fn set_point_light(&mut self, engine: &'static mut Engine, range: f32) {
        let engine2 = ENGINE.physic_engine_mut();
        let gpu_mesh = &mut engine2.gpu_meshes[self.gpu_mesh_alignment];

        gpu_mesh.set_point_light(engine, range, self.gpu_alignment);
    }
    pub unsafe fn set_directional_light(&mut self, engine: &'static mut Engine, range: f32) {
        let engine2 = ENGINE.physic_engine_mut();
        let gpu_mesh = &mut engine2.gpu_meshes[self.gpu_mesh_alignment];

        gpu_mesh.set_directional_light(engine, range, self.gpu_alignment);
    }
    pub unsafe fn update_matrix(&mut self) {
        let engine2 = ENGINE.physic_engine_mut();
        let gpu_mesh = &mut engine2.gpu_meshes[self.gpu_mesh_alignment];

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

        let sx = self.scaling.x;
        let sy = self.scaling.y;
        let sz = self.scaling.z;

        gpu_mesh.transformation.x.x = (1.0 - (yy + zz)) * sx;
        gpu_mesh.transformation.x.y = (xy + wz) * sx;
        gpu_mesh.transformation.x.z = (xz - wy) * sx;

        gpu_mesh.transformation.y.x = (xy - wz) * sy;
        gpu_mesh.transformation.y.y = (1.0 - (xx + zz)) * sy;
        gpu_mesh.transformation.y.z = (yz + wx) * sy;

        gpu_mesh.transformation.z.x = (xz + wy) * sz;
        gpu_mesh.transformation.z.y = (yz - wx) * sz;
        gpu_mesh.transformation.z.z = (1.0 - (xx + yy)) * sz;
    }
    pub unsafe fn intersect_box_aa_sphere(
        &mut self,
        collider: &crate::collider::Collider,
        radius: f32,
    ) -> bool {
        let pos = self.gpu_mesh_alignment;
        let g = self.get_geometry_mut();
        let engine2 = ENGINE.physic_engine();
        let gpu_mesh = &engine2.gpu_meshes[pos];

        g.update_bounding_box(&gpu_mesh.transformation);
        self.get_geometry_mut()
            .bounding_box
            .intersect_box_aa_sphere(collider, radius)
    }
}
impl Drop for Mesh {
    fn drop(&mut self) {
        unsafe {
            let engine2 = ENGINE.physic_engine();
            let gpu_mesh = &engine2.gpu_meshes[self.gpu_mesh_alignment];

            if gpu_mesh.point_light_squared > 0.0 {
                let index = ENGINE
                    .point_lights
                    .iter()
                    .position(|x| *x == self.gpu_alignment)
                    .unwrap();
                ENGINE.point_lights.swap_remove(index);
                #[cfg(feature = "webgpu")]
                ENGINE.update_point_lights();
            }
            if gpu_mesh.directional_light > 0.0 {
                let index = ENGINE
                    .directional_lights
                    .iter()
                    .position(|x| *x == self.gpu_alignment)
                    .unwrap();
                ENGINE.directional_lights.swap_remove(index);
                #[cfg(feature = "webgpu")]
                ENGINE.update_directional_lights();
            }
            #[cfg(feature = "webgpu")]
            ENGINE.de_allocate_gpu(self.gpu_alignment);
        }
    }
}
