

use core::panic;

use rapier3d::prelude::*;
pub use crate::engine::Engine;
pub use crate::engine::ENGINE;
pub use crate::GPUMesh;
use crate::engine::Engine2;
use crate::engine::jslog_string;
pub use crate::geometry::Geometry;
pub use crate::geometry::Plane;
pub use crate::geometry::ColliderPlane;
pub use crate::boundingbox::BoundingBox;
use crate::math2::Quaternion;
use crate::math2::Vec3;
use crate::math2::Vec4;
pub use crate::terrain::elevator::Elevator;
pub use crate::drawable::Drawable;
pub use crate::drawable::DrawCommand;
pub use crate::drawable::DrawType;
use crate::math2::Vec3F32;


pub struct Mesh {
    pub id:u32,
    pub gpu_alignment: u32, //Alignment in GPU memory. Real alignment is 256 + gpu_alignment because first block is used for indexing
    pub gpu_mesh_alignment: usize, //Alignment in engine.gpu_meshes vector
    pub rotation: Quaternion,
    scaling: Vec3<f32>,
    pub geometry:Option<Geometry>,
    pub positions_count:usize,
    pub strip:bool,
    pub draw_command: DrawCommand,
    rigid_body_handle: Option<RigidBodyHandle>,
    collider_handle: Option<ColliderHandle>,
    pub label: String
}
#[no_mangle]
pub unsafe extern "C" fn new_mesh(
    id:u32,
    positions_count:usize,
    point_light:f32,
    directional_light:f32,
    scenes:f32,
    strip:bool,
    fixed: bool,
    rigid_body: bool,
    label: *mut std::os::raw::c_char) -> *const Mesh {
        let cstr = std::ffi::CString::from_raw(label);
        match cstr.to_str() {
            Ok(str) => {
                let e = ENGINE.physic_engine_mut();
                let mesh = Mesh::new(id, positions_count,point_light,directional_light,scenes,strip,fixed,rigid_body, str.to_string(), e);
                (*mesh).update_dynamic_buffer();
                return mesh;    
            }
            Err(error) => {
                panic!("{}", &error.to_string());
            }
        }
}
#[no_mangle]
pub unsafe extern "C" fn add_geometry(
    mesh:*mut Mesh,
    has_bounding:bool,
    vertices_stride:usize,
    static_faces:bool,
    strip:bool) {        
        (*mesh).add_geometry(has_bounding, vertices_stride, static_faces, strip);
}
#[no_mangle]
pub unsafe extern "C" fn add_collider(
    mesh:*mut Mesh,
    collider:*const Collider) {
        let coll=std::ptr::read(collider);
        (*mesh).add_collider(coll, ENGINE.physic_engine_mut());
}
#[no_mangle]
pub unsafe extern "C" fn set_vertices(mesh:*mut Mesh, ptr:*mut f32, length:usize) {
    let vertices=Vec::from_raw_parts(ptr, length, length);
    (*mesh).get_geometry_mut().set_vertices(vertices);
}
#[no_mangle]
pub unsafe extern "C" fn set_indices_and_vertices(mesh:*mut Mesh, indices_ptr:*mut usize, indices_length:usize, vertices_ptr:*mut f32, vertices_length:usize) {
    let indices=Vec::from_raw_parts(indices_ptr, indices_length, indices_length);
    let vertices=Vec::from_raw_parts(vertices_ptr, vertices_length, vertices_length);
    let geometry = (*mesh).get_geometry_mut();
    geometry.indices=indices;
    geometry.set_vertices(vertices);

}
#[no_mangle]
pub unsafe extern "C" fn vertices_pointer(mesh: *mut Mesh) -> *const f32 {
    (*mesh).get_geometry_mut().vertices.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn last_collider_world_vertices_pointer(mesh: *mut Mesh) -> *const f32 {
    (*mesh).get_geometry_mut().last_collider_world_vertices.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn vertices_count(mesh_ptr:*mut Mesh) -> usize {
    (*mesh_ptr).get_geometry_mut().vertices.len() / (*mesh_ptr).get_geometry_mut().vertices_stride
}
#[no_mangle]
pub unsafe extern "C" fn faces_count(mesh_ptr:*mut Mesh) -> usize {
    (*mesh_ptr).get_geometry_mut().faces_count()
}
#[no_mangle]
pub unsafe extern "C" fn update_scale(mesh_ptr:*mut Mesh, x: f32, y: f32, z: f32) {
    (*mesh_ptr).scaling.x = x;
    (*mesh_ptr).scaling.y = y;
    (*mesh_ptr).scaling.z = z;
    (*mesh_ptr).on_update();
}
#[no_mangle]
pub unsafe extern "C" fn update_dynamic_buffer(mesh_ptr:*const Mesh) {
    (*mesh_ptr).update_dynamic_buffer();
}
#[no_mangle]
pub unsafe extern "C" fn update_euler_angles(mesh_ptr:*mut Mesh, x: f32, y: f32, z: f32) {
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

    (*mesh_ptr).rotation.i = (cos_yaw * sin_pitch * cos_roll) + (sin_yaw * cos_pitch * sin_roll);
    (*mesh_ptr).rotation.j = (sin_yaw * cos_pitch * cos_roll) - (cos_yaw * sin_pitch * sin_roll);
    (*mesh_ptr).rotation.k = (cos_yaw * cos_pitch * sin_roll) - (sin_yaw * sin_pitch * cos_roll);
    (*mesh_ptr).rotation.w = (cos_yaw * cos_pitch * cos_roll) + (sin_yaw * sin_pitch * sin_roll);
    (*mesh_ptr).on_update();
}
#[no_mangle]
pub unsafe extern "C" fn update_rotation(mesh_ptr:*mut Mesh, x: f32, y: f32, z: f32, w: f32) {
    (*mesh_ptr).rotation.i = x;
    (*mesh_ptr).rotation.j = y;
    (*mesh_ptr).rotation.k = z;
    (*mesh_ptr).rotation.w = w;
    (*mesh_ptr).on_update();
}
#[no_mangle]
pub unsafe extern "C" fn update_translation(mesh_ptr:*mut Mesh, x: f32, y: f32, z: f32) {
    (*mesh_ptr).set_translation(x, y, z)
}
#[no_mangle]
pub unsafe extern "C" fn apply_impulse(mesh_ptr:*mut Mesh, x: f32, y: f32, z: f32) {
    (*mesh_ptr).apply_impulse(x, y, z)
}
#[no_mangle]
pub unsafe extern "C" fn indices_pointer(mesh_ptr:*mut Mesh) -> *const usize {
    (*mesh_ptr).get_geometry_mut().indices.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn gpu_alignment(mesh_ptr:*const Mesh) -> u32 {
    (*mesh_ptr).gpu_alignment
}
#[no_mangle]
pub unsafe extern "C" fn positions_count(mesh_ptr:*const Mesh) -> usize {
    (*mesh_ptr).positions_count
}
#[no_mangle]
pub unsafe extern "C" fn id(mesh_ptr:*const Mesh) -> u32 {
    (*mesh_ptr).id
}
#[no_mangle]
pub unsafe extern "C" fn strip(mesh_ptr:*const Mesh) -> bool {
    (*mesh_ptr).strip
}
#[no_mangle]
pub unsafe extern "C" fn collider_planes_parallel_pointer(mesh_ptr:*mut Mesh) -> *const [f32; 4] {
    (*mesh_ptr).get_geometry_mut().collider_planes_parallel.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn gpu_pointer(mesh_ptr:*const Mesh) -> *const Vec4<Vec4<f32>> {
    let engine2 = ENGINE.physic_engine();
    &engine2.gpu_meshes[*&(*mesh_ptr).gpu_mesh_alignment].transformation
}
#[no_mangle]
pub unsafe extern "C" fn translation_pointer(mesh_ptr:*const Mesh) -> *const Vec4<f32> {
    let engine2 = ENGINE.physic_engine();
    &engine2.gpu_meshes[*&(*mesh_ptr).gpu_mesh_alignment].transformation.w

}
#[no_mangle]
pub unsafe extern "C" fn velocity_pointer(mesh_ptr:*const Mesh) -> *const [f32; 4] {
    let engine2 = ENGINE.physic_engine();
    &engine2.gpu_meshes[*&(*mesh_ptr).gpu_mesh_alignment].delta
}
#[no_mangle]
pub unsafe extern "C" fn intersect_box_aa_sphere(mesh_ptr:*mut Mesh, collider:*const crate::collider::Collider, radius:f32) -> bool {
    (*mesh_ptr).intersect_box_aa_sphere(&(*collider), radius)
}
#[no_mangle]
pub unsafe extern "C" fn create_trimesh_collider(mesh_ptr:*mut Mesh) -> *mut Collider {
    (*mesh_ptr).create_trimesh_collider()
}
#[no_mangle]
pub unsafe extern "C" fn create_convex_hull_collider(mesh_ptr:*mut Mesh) -> *mut Collider {
    (*mesh_ptr).create_convex_hull_collider()
}

#[cfg(debug_assertions)]
#[no_mangle]
pub unsafe extern "C" fn bounding_min_pointer(mesh_ptr:*mut Mesh) -> *const Vec3F32 {
    let engine2 = ENGINE.physic_engine();
    let gpu_mesh = &engine2.gpu_meshes[*&(*mesh_ptr).gpu_mesh_alignment];

    (*mesh_ptr).get_geometry_mut().update_bounding_box(&gpu_mesh.transformation);
    (&(*mesh_ptr).get_geometry_mut().bounding_box.min) as *const Vec3F32


}
#[cfg(debug_assertions)]
#[no_mangle]
pub unsafe extern "C" fn bounding_max_pointer(mesh_ptr:*mut Mesh) -> *const Vec3F32 {
    let engine2 = ENGINE.physic_engine();
    let gpu_mesh = &engine2.gpu_meshes[*&(*mesh_ptr).gpu_mesh_alignment];

    (*mesh_ptr).get_geometry_mut().update_bounding_box(&gpu_mesh.transformation);
    (&(*mesh_ptr).get_geometry_mut().bounding_box.max) as *const Vec3F32
}
#[no_mangle]
pub unsafe extern "C" fn scale_x(mesh_ptr:*mut Mesh) -> f32 {
    (*mesh_ptr).scaling.x
}
#[no_mangle]
pub unsafe extern "C" fn scale_y(mesh_ptr:*mut Mesh) -> f32 {
    (*mesh_ptr).scaling.y
}
#[no_mangle]
pub unsafe extern "C" fn scale_z(mesh_ptr:*mut Mesh) -> f32 {
    (*mesh_ptr).scaling.z
}
#[no_mangle]
pub unsafe extern "C" fn vertices_stride(mesh_ptr:*mut Mesh) -> usize {
    (*mesh_ptr).get_geometry_mut().vertices_stride
}
#[no_mangle]
pub unsafe extern "C" fn set_faces(mesh_ptr:*mut Mesh, ptr:*mut Plane, length:usize) {
    let planes=Vec::from_raw_parts(ptr, length/4, length/4);
    (*mesh_ptr).get_geometry_mut().collider_planes=Vec::with_capacity(planes.len());
    (*mesh_ptr).get_geometry_mut().collider_planes_parallel=Vec::with_capacity(planes.len());
    (*mesh_ptr).get_geometry_mut().faces.planes=planes;
}
#[no_mangle]
pub unsafe extern "C" fn set_gpu_custom_data(mesh_ptr:*mut Mesh, data_0:f32, data_1:f32,data_2:f32,data_3:f32) {
    let engine2 = ENGINE.physic_engine_mut();
    let gpu_mesh = &mut engine2.gpu_meshes[*&(*mesh_ptr).gpu_mesh_alignment];

    gpu_mesh.custom[0]=data_0;
    gpu_mesh.custom[1]=data_1;
    gpu_mesh.custom[2]=data_2;
    gpu_mesh.custom[3]=data_3;
}
#[no_mangle]
pub unsafe extern "C" fn collider_faces_pointer(mesh_ptr:*mut Mesh) -> *const ColliderPlane {
    (*mesh_ptr).get_geometry_mut().collider_planes.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn set_scenes(mesh_ptr:*mut Mesh, scenes: u32) {
    let engine2 = ENGINE.physic_engine_mut();
    let gpu_mesh = &mut engine2.gpu_meshes[*&(*mesh_ptr).gpu_mesh_alignment];

    gpu_mesh.scenes = scenes;
    (*mesh_ptr).update_dynamic_buffer();
}
#[no_mangle]
pub unsafe extern "C" fn update_scale_and_rotation(mesh_ptr:*mut Mesh, x: f32, y: f32, z: f32, rx: f32, ry: f32, rz: f32, rw: f32) {
    (*mesh_ptr).scaling.x = x;
    (*mesh_ptr).scaling.y = y;
    (*mesh_ptr).scaling.z = z;
    (*mesh_ptr).rotation.i = rx;
    (*mesh_ptr).rotation.j = ry;
    (*mesh_ptr).rotation.k = rz;
    (*mesh_ptr).rotation.w = rw;
    (*mesh_ptr).on_update();
}
#[no_mangle]
pub unsafe extern "C" fn faces_pointer(mesh_ptr:*mut Mesh) -> *const Plane {
    if !(*mesh_ptr).get_geometry_mut().static_faces && (*mesh_ptr).get_geometry_mut().faces.planes.len() == 0 {
        panic!("Not implemented yet, TODO: Generate faces");
        //Remember to allocate memory for collider planes also and otger collider stuff also
    }
    return (*mesh_ptr).get_geometry_mut().faces.planes.as_ptr();
}
#[no_mangle]
pub unsafe extern "C" fn bounding_vectors_pointer_simd(mesh_ptr:*mut Mesh) -> *const Vec3<Vec4<f32>> {
    let engine2 = ENGINE.physic_engine();
    let gpu_mesh = &engine2.gpu_meshes[*&(*mesh_ptr).gpu_mesh_alignment];

    (*mesh_ptr).get_geometry_mut().update_bounding_box(&gpu_mesh.transformation);
    (&(*mesh_ptr).get_geometry_mut().bounding_box.vectors_simd) as *const Vec3<Vec4<f32>>
}
impl Mesh {
    pub fn draw(&self) -> *const usize {
        &self.draw_command as *const _ as *const usize
    }
}

impl Mesh {
    pub fn create_flat_collider(&self) -> *mut Collider {
        let geometry = self.get_geometry();
        let iterator=geometry.vertices.chunks(geometry.vertices_stride).into_iter();
        let vertices_amount = geometry.vertices.len() / geometry.vertices_stride;
        let mut vertices:Vec<Point<Real>> = Vec::with_capacity(vertices_amount);
        iterator.for_each(|i| {
            // TODO: ensure simd
            vertices.push(Point::new(i[0] * self.scaling.x, i[1] * self.scaling.y, i[2] * self.scaling.z));
            vertices.push(Point::new(i[0] * self.scaling.x - 0.01, i[1] * self.scaling.y, i[2] * self.scaling.z));
        });
        let hull = ColliderBuilder::convex_hull(&vertices);
        match hull {
            Some(h) => {
                let collider = Box::new(h.mass_properties(MassProperties::new(
                    point![0.0, 1.0, 0.0],
                    0.5,
                    vector![0.3, 0.2, 0.1],
                )).build());
                Box::leak(collider)
            }
            None => {
                panic!("Cannot create convex hull");
            }
        }
    }
    pub fn create_convex_hull_collider(&self) -> *mut Collider {
        let geometry = self.get_geometry();
        let iterator=geometry.vertices.chunks(geometry.vertices_stride).into_iter();
        let vertices_amount = geometry.vertices.len() / geometry.vertices_stride;
        let mut vertices:Vec<Point<Real>> = Vec::with_capacity(vertices_amount*2);
        iterator.for_each(|i| {
            // TODO: ensure simd
            vertices.push(Point::new(i[0] * self.scaling.x, i[1] * self.scaling.y, i[2] * self.scaling.z));
            vertices.push(Point::new(i[0] * self.scaling.x - 0.1, i[1] * self.scaling.y, i[2] * self.scaling.z));
        });
        jslog_string(vec!["convex hull".to_string(), self.label.to_string(), format!["{:?}",vertices]]);
        let hull = ColliderBuilder::convex_hull(&vertices);
        match hull {
            Some(h) => {
                let collider = Box::new(h.mass_properties(MassProperties::new(
                    point![0.0, 1.0, 0.0],
                    0.5,
                    vector![0.3, 0.2, 0.1],
                )).build());
                Box::leak(collider)
            }
            None => {
                panic!("Cannot create convex hull");
            }
        }
    }

    //TODO: move to geometry
    pub fn create_trimesh_collider(&self) -> *mut Collider {

        let geometry = self.get_geometry();
        let iterator=geometry.vertices.chunks(geometry.vertices_stride).into_iter();
        let vertices_amount = geometry.vertices.len() / geometry.vertices_stride;
        let mut vertices:Vec<Point<Real>> = Vec::with_capacity(vertices_amount);
        iterator.for_each(|i| {
            // TODO: ensure simd
            vertices.push(Point::new(i[0] * self.scaling.x, i[1] * self.scaling.y, i[2] * self.scaling.z));
        });
        if self.label == "human" {
            jslog_string(vec!["human vertices".to_string(), format!("{:?}", vertices)]);
        }
        let mut indices:Vec<[u32; 3]>;
        if geometry.indices.len() == 0 {
            if self.strip {
                panic!("Unindexed Trimesh collider with triangle strip is not yet supported");
            }
            indices = Vec::with_capacity(vertices_amount);
            let mut pos = 0;
            while pos < vertices_amount {
                indices.push([pos as u32, pos as u32 + 1, pos as u32 + 2]);
                pos = pos + 3;
            }
        } else {
            if self.strip {
                indices = Vec::with_capacity(geometry.indices.len()-2);
                geometry.indices.windows(3).for_each(|i| {
                    indices.push([i[0] as u32, i[1] as u32, i[2] as u32]);
                });
            } else {
                indices = Vec::with_capacity(geometry.indices.len()/3);
                geometry.indices.chunks(3).into_iter().for_each(|i| {
                    indices.push([i[0] as u32, i[1] as u32, i[2] as u32]);
                });
            }
        }
      /*  jslog_string(vec!["create_trimesh_collider".to_string(), vertices.len().to_string(), indices.len().to_string() ]);
        jslog_string(vec![format!("{:?}", vertices)]);
        jslog_string(vec![format!("{:?}", indices)]);*/
        let collider = Box::new(ColliderBuilder::trimesh(vertices, indices).density(2.0).restitution(0.5).build());
        Box::leak(collider)
    }
    pub unsafe fn add_geometry<'a>(
        &'static mut self,
        has_bounding:bool,
        vertices_stride:usize,
        static_faces:bool,
        strip:bool) {
        self.geometry=Some(Geometry::new(has_bounding, vertices_stride, static_faces,strip));
    }

    pub unsafe fn add_collider<'a>(
        &'static mut self,
        collider:Collider,
        engine2: &'static mut Engine2) {
           /*  let aabb = collider.compute_aabb();
            let (vertices, indices) = aabb.to_trimesh();
            jslog_string(vec![format!("{:?}", vertices)]);
            jslog_string(vec![format!("{:?}", indices)]);*/
            match self.rigid_body_handle {
                Some(rigid_body_handle) => {
                    let old = self.collider_handle.replace(engine2.collider_set.insert_with_parent(collider, rigid_body_handle, &mut engine2.rigid_body_set));
                    match old {
                        Some(handle) => {
                            jslog_string(vec!["remove old collider".to_string()]);
                            engine2.collider_set.remove(handle, &mut engine2.island_manager, &mut engine2.rigid_body_set, true);
                        }
                        _ => ()
                    };
                }
                None => {
                    self.collider_handle.replace(engine2.collider_set.insert(collider));
                }
            }

    }

    pub unsafe fn new<'a>(
        id:u32,
        positions_count:usize,
        point_light:f32,
        directional_light:f32,
        scenes:f32,
        strip:bool,
        fixed:bool,
        rigid_body: bool,
        label: String,
        engine2: &'static mut Engine2) -> *const Mesh {
        let mut m = Mesh {
            id,
            gpu_mesh_alignment: engine2.gpu_meshes.len(),
            gpu_alignment: ENGINE.allocate_gpu(),
            geometry: None,
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
            draw_command: DrawCommand {
                draw_type: DrawType::Simple,
                vertex_count: 0,
                instance_count: 0,
                first_vertex: 0,
                first_instance: 0,
                index_count: 0,
                first_index: 0,
                base_vertex: 0
            },
            rigid_body_handle: None,
            collider_handle: None,
            label
        };
        engine2.gpu_meshes.push(GPUMesh {
            transformation: Vec4 {
                x: Vec4 { x:1.0, y:0.0, z:0.0, w:0.0},
                y: Vec4 { x:0.0, y:1.0, z:0.0, w:0.0},
                z: Vec4 { x:0.0, y:0.0, z:1.0, w:0.0},
                w: Vec4 { x:0.0, y:0.0, z:0.0, w:1.0},
            },
            delta: [0.0, 0.0, 0.0, 0.0],
            custom: [0.0, 0.0, 0.0, 0.0],
            acceleration: [0.0, 0.0, 0.0, 0.0],
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

        let new_id=engine2.meshes.len();
        
        let ptr: *const Mesh;
        if rigid_body {
            let rigid_body_builder:RigidBodyBuilder;
            if fixed {
                rigid_body_builder = RigidBodyBuilder::fixed();
            } else {
                rigid_body_builder = RigidBodyBuilder::dynamic().sleeping(true).ccd_enabled(true);
            }
            let rigid_body=rigid_body_builder.build();
            let rigid_body_handle = engine2.rigid_body_set.insert(rigid_body);
            m.rigid_body_handle = Some(rigid_body_handle);
            engine2.meshes.push(m);
            ptr = &engine2.meshes[new_id] as *const Mesh;
            engine2.rigid_bodies.insert(rigid_body_handle, &mut engine2.meshes[new_id]);
        } else {
            engine2.meshes.push(m);
            ptr = &engine2.meshes[new_id] as *const Mesh;

        }
        return ptr;
    }
    pub fn get_geometry(&self) -> &Geometry {
        match &self.geometry {
            Some(g) => {
                g
            }
            None => {
                panic!("Mesh has no geometry")
            }
        }
    }
    pub fn get_geometry_mut(&mut self) -> &mut Geometry {
        match &mut self.geometry {
            Some(g) => {
                g
            }
            None => {
                panic!("Mesh has no geometry")
            }
        }
    }
    pub unsafe fn set_translation(&mut self, x:f32, y:f32, z:f32) {
        self.update_translation(x,y,z);
        let e = ENGINE.physic_engine_mut();
        match self.rigid_body_handle {
            Some(rigid_body_handle) => {
                let rigid_body = e.rigid_body_set.get_mut(rigid_body_handle);
                match rigid_body {
                    Some(rigid_body) => rigid_body.set_translation(vector![x, y, z], true),
                    None    => panic!("Rigid body not found"),
                };
            }
            _ => {}
        }
    }
    pub unsafe fn update_translation(&mut self, x:f32, y:f32, z:f32) {
        let engine2 = ENGINE.physic_engine_mut();
        let gpu_mesh = &mut engine2.gpu_meshes[self.gpu_mesh_alignment];
    
        gpu_mesh.transformation.w.x=x;
        gpu_mesh.transformation.w.y=y;
        gpu_mesh.transformation.w.z=z;
        self.update_dynamic_buffer();
    }
    pub unsafe fn apply_impulse(&mut self, x:f32, y:f32, z:f32) {
        let e = ENGINE.physic_engine_mut();
        match self.rigid_body_handle {
            Some(rigid_body_handle) => {
                let rigid_body = e.rigid_body_set.get_mut(rigid_body_handle);
                match rigid_body {
                    Some(rigid_body) => rigid_body.apply_impulse(vector![x, y, z], true),
                    None    => panic!("Rigid body not found"),
                };
            }
            _ => {}
        }
    }
    pub unsafe fn update_dynamic_buffer(&self) {
        let engine2 = ENGINE.physic_engine();
        let gpu_mesh = &engine2.gpu_meshes[self.gpu_mesh_alignment];

        ENGINE.gpu_queue2.push((&gpu_mesh, self.gpu_alignment));
    }

    fn on_update(&mut self) {
        unsafe {
            self.update_matrix();
            self.update_dynamic_buffer();
            let e = ENGINE.physic_engine_mut();
            let gpu_mesh = &mut e.gpu_meshes[self.gpu_mesh_alignment];
            match self.rigid_body_handle {
                Some(rigid_body_handle) => {
                    let rigid_body = e.rigid_body_set.get_mut(rigid_body_handle);
                    match rigid_body {
                        Some(rigid_body) => 
                        {
                            rigid_body.set_translation(vector![gpu_mesh.transformation.w.x, gpu_mesh.transformation.w.y, gpu_mesh.transformation.w.z], true);
                           /* let (euler_x, euler_y, euler_z) = Rotation::from_quaternion(nalgebra::Quaternion::new(self.rotation.w, self.rotation.x, self.rotation.y, self.rotation.z)).euler_angles();
                            let avec = AngVector::new(euler_x, euler_y, euler_z);
                          rigid_body.set_rotation(avec, true);*/
                          
                            rigid_body.set_quaternation(nalgebra::Unit::from_quaternion(nalgebra::Quaternion::new(self.rotation.w, self.rotation.i, self.rotation.j, self.rotation.k)), true)

                         },
                        None    => panic!("Rigid body not found"),
                    };
                }
                _ => {}
            }
        }
        if self.get_geometry_mut().bounding_box.has_bounding {
            self.get_geometry_mut().bounding_box.dirty=true;
        }
    }


    pub fn set_scale_x(&mut self, x:f32) {
        self.scaling.x=x;
        self.on_update();
    }
    pub fn set_scale_y(&mut self, y:f32) {
        self.scaling.y=y;
        self.on_update();
    }

    pub fn set_scale_z(&mut self, z:f32) {
        self.scaling.z=z;
        self.on_update();
    }

    pub unsafe fn acceleration_pointer(&self) -> *const [f32; 4] {
        let engine2 = ENGINE.physic_engine();
        let gpu_mesh = &engine2.gpu_meshes[self.gpu_mesh_alignment];
        &gpu_mesh.acceleration
    }
    pub unsafe fn set_point_light(&mut self, engine:&mut Engine, range:f32) {
        let engine2 = ENGINE.physic_engine_mut();
        let gpu_mesh = &mut engine2.gpu_meshes[self.gpu_mesh_alignment];

        gpu_mesh.set_point_light(engine, range, self.gpu_alignment);
    }
    pub unsafe fn set_directional_light(&mut self, engine:&mut Engine, range:f32) {
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
    pub unsafe fn intersect_box_aa_sphere(&mut self, collider: &crate::collider::Collider, radius:f32) -> bool {
        let pos = self.gpu_mesh_alignment;
        let g = self.get_geometry_mut();
        let engine2 = ENGINE.physic_engine();
        let gpu_mesh = &engine2.gpu_meshes[pos];

        g.update_bounding_box(&gpu_mesh.transformation);
        self.get_geometry_mut().bounding_box.intersect_box_aa_sphere(collider, radius)
    }
}
impl Drop for Mesh {
    fn drop(&mut self) {
        unsafe {
            let engine2 = ENGINE.physic_engine();
            let gpu_mesh = &engine2.gpu_meshes[self.gpu_mesh_alignment];
    
            if gpu_mesh.point_light_squared > 0.0 {
                let index = ENGINE.point_lights.iter().position(|x| *x == self.gpu_alignment).unwrap();
                ENGINE.point_lights.swap_remove(index);
                #[cfg(feature = "webgpu")]
                ENGINE.update_point_lights();
            }
            if gpu_mesh.directional_light > 0.0 {
                let index = ENGINE.directional_lights.iter().position(|x| *x == self.gpu_alignment).unwrap();
                ENGINE.directional_lights.swap_remove(index);
                #[cfg(feature = "webgpu")]
                ENGINE.update_directional_lights();
            }
            #[cfg(feature = "webgpu")]
            ENGINE.de_allocate_gpu(self.gpu_alignment);
        }
    }
}