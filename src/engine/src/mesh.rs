

pub use crate::engine::Engine;
pub use crate::engine::ENGINE;
pub use crate::Vec3;
pub use crate::Vec3_f32;
pub use crate::Vec4;
pub use crate::GPUMesh;
pub use crate::geometry::Geometry;
pub use crate::geometry::Plane;
pub use crate::geometry::ColliderPlane;
pub use crate::boundingbox::BoundingBox;
pub use crate::terrain::elevator::Elevator;
pub use crate::drawable::Drawable;
pub use crate::drawable::DrawCommand;
pub use crate::drawable::DrawType;

pub struct Mesh {
    pub id:u32,
    pub gpu_alignment: u32, //Alignment in GPU memory. Real alignment is 256 + gpu_alignment because first block is used for indexing
    pub gpu_mesh: GPUMesh,
    rotation: Vec4<f32>,
    scaling: Vec3<f32>,
    pub geometry:Geometry,
    pub positions_count:usize,
    pub strip:bool,
    pub draw_command: DrawCommand
}
/*
extern "C" {
    fn log(s: &str);
    fn error(s: &str);
}
*/
#[no_mangle]
pub unsafe extern "C" fn new_mesh(
    id:u32,
    has_bounding:bool,
    has_geometry:bool,
    positions_count:usize,
    vertices_stride:usize,
    point_light:f32,
    directional_light:f32,
    scenes:f32,
    static_faces:bool,
    strip:bool) -> *mut Mesh {
        let mesh = Box::new(Mesh::new(id, has_bounding, has_geometry,positions_count,vertices_stride,point_light,directional_light,scenes,static_faces,strip));
        let ptr=Box::leak(mesh);
        (*ptr).update_dynamic_buffer();
        return ptr;
}
#[no_mangle]
pub unsafe extern "C" fn update_vertices(mesh:*mut Mesh, ptr:*mut f32, length:usize) {
    let vertices=Vec::from_raw_parts(ptr, length, length);
    (*mesh).geometry.update_vertices(vertices);
}
#[no_mangle]
pub unsafe extern "C" fn set_indices(mesh:*mut Mesh, ptr:*mut usize, length:usize) {
    let indices=Vec::from_raw_parts(ptr, length, length);
    (*mesh).geometry.indices=indices;
    (*mesh).geometry.allocate_faces();
}
#[no_mangle]
pub unsafe extern "C" fn vertices_pointer(mesh: *const Mesh) -> *const f32 {
    (*mesh).geometry.vertices.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn last_collider_world_vertices_pointer(mesh: *const Mesh) -> *const f32 {
    (*mesh).geometry.last_collider_world_vertices.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn vertices_count(mesh_ptr:*const Mesh) -> usize {
    (*mesh_ptr).geometry.vertices.len() / (*mesh_ptr).geometry.vertices_stride
}
#[no_mangle]
pub unsafe extern "C" fn faces_count(mesh_ptr:*const Mesh) -> usize {
    (*mesh_ptr).geometry.faces_count()
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

    (*mesh_ptr).rotation.x = (cos_yaw * sin_pitch * cos_roll) + (sin_yaw * cos_pitch * sin_roll);
    (*mesh_ptr).rotation.y = (sin_yaw * cos_pitch * cos_roll) - (cos_yaw * sin_pitch * sin_roll);
    (*mesh_ptr).rotation.z = (cos_yaw * cos_pitch * sin_roll) - (sin_yaw * sin_pitch * cos_roll);
    (*mesh_ptr).rotation.w = (cos_yaw * cos_pitch * cos_roll) + (sin_yaw * sin_pitch * sin_roll);
    (*mesh_ptr).on_update();
}
#[no_mangle]
pub unsafe extern "C" fn update_rotation(mesh_ptr:*mut Mesh, x: f32, y: f32, z: f32, w: f32) {
    (*mesh_ptr).rotation.x = x;
    (*mesh_ptr).rotation.y = y;
    (*mesh_ptr).rotation.z = z;
    (*mesh_ptr).rotation.w = w;
    (*mesh_ptr).on_update();
}
#[no_mangle]
pub unsafe extern "C" fn indices_pointer(mesh_ptr:*const Mesh) -> *const usize {
    (*mesh_ptr).geometry.indices.as_ptr()
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
pub unsafe extern "C" fn collider_planes_parallel_pointer(mesh_ptr:*const Mesh) -> *const [f32; 4] {
    (*mesh_ptr).geometry.collider_planes_parallel.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn gpu_pointer(mesh_ptr:*const Mesh) -> *const Vec4<Vec4<f32>> {
    &(*mesh_ptr).gpu_mesh.transformation
}
#[no_mangle]
pub unsafe extern "C" fn translation_pointer(mesh_ptr:*const Mesh) -> *const Vec4<f32> {
    &(*mesh_ptr).gpu_mesh.transformation.w
}
#[no_mangle]
pub unsafe extern "C" fn velocity_pointer(mesh_ptr:*const Mesh) -> *const [f32; 4] {
    &(*mesh_ptr).gpu_mesh.delta
}
#[no_mangle]
pub unsafe extern "C" fn bounding_min_pointer(mesh_ptr:*mut Mesh) -> *const Vec3_f32 {
    (*mesh_ptr).geometry.update_bounding_box(&(*mesh_ptr).gpu_mesh.transformation);
    (&(*mesh_ptr).geometry.bounding_box.min) as *const Vec3_f32
}
#[no_mangle]
pub unsafe extern "C" fn bounding_max_pointer(mesh_ptr:*mut Mesh) -> *const Vec3_f32 {
    (*mesh_ptr).geometry.update_bounding_box(&(*mesh_ptr).gpu_mesh.transformation);
    (&(*mesh_ptr).geometry.bounding_box.max) as *const Vec3_f32
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
    (*mesh_ptr).geometry.vertices_stride
}
#[no_mangle]
pub unsafe extern "C" fn set_faces(mesh_ptr:*mut Mesh, ptr:*mut Plane, length:usize) {
    let planes=Vec::from_raw_parts(ptr, length/4, length/4);
    (*mesh_ptr).geometry.collider_planes=Vec::with_capacity(planes.len());
    (*mesh_ptr).geometry.collider_planes_parallel=Vec::with_capacity(planes.len());
    (*mesh_ptr).geometry.faces.planes=planes;
}
#[no_mangle]
pub unsafe extern "C" fn set_gpu_custom_data(mesh_ptr:*mut Mesh, data_0:f32, data_1:f32,data_2:f32,data_3:f32) {
    (*mesh_ptr).gpu_mesh.custom[0]=data_0;
    (*mesh_ptr).gpu_mesh.custom[1]=data_1;
    (*mesh_ptr).gpu_mesh.custom[2]=data_2;
    (*mesh_ptr).gpu_mesh.custom[3]=data_3;
}
#[no_mangle]
pub unsafe extern "C" fn collider_faces_pointer(mesh_ptr:*mut Mesh) -> *const ColliderPlane {
    (*mesh_ptr).geometry.collider_planes.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn set_scenes(mesh_ptr:*mut Mesh, scenes: u32) {
    (*mesh_ptr).gpu_mesh.scenes = scenes;
    (*mesh_ptr).update_dynamic_buffer();
}
#[no_mangle]
pub unsafe extern "C" fn update_scale_and_rotation(mesh_ptr:*mut Mesh, x: f32, y: f32, z: f32, rx: f32, ry: f32, rz: f32, rw: f32) {
    (*mesh_ptr).scaling.x = x;
    (*mesh_ptr).scaling.y = y;
    (*mesh_ptr).scaling.z = z;
    (*mesh_ptr).rotation.x = rx;
    (*mesh_ptr).rotation.y = ry;
    (*mesh_ptr).rotation.z = rz;
    (*mesh_ptr).rotation.w = rw;
    (*mesh_ptr).on_update();
}
#[no_mangle]
pub unsafe extern "C" fn faces_pointer(mesh_ptr:*mut Mesh) -> *const Plane {
    if !(*mesh_ptr).geometry.static_faces && (*mesh_ptr).geometry.faces.planes.len() == 0 {
        panic!("Not implemented yet, TODO: Generate faces");
        //Remember to allocate memory for collider planes also and otger collider stuff also
    }
    return (*mesh_ptr).geometry.faces.planes.as_ptr();
}
#[no_mangle]
pub unsafe extern "C" fn bounding_vectors_pointer_simd(mesh_ptr:*mut Mesh) -> *const Vec3<Vec4<f32>> {
    (*mesh_ptr).geometry.update_bounding_box(&(*mesh_ptr).gpu_mesh.transformation);
    (&(*mesh_ptr).geometry.bounding_box.vectors_simd) as *const Vec3<Vec4<f32>>
}
impl Mesh {
    pub fn draw(&self) -> *const usize {
        &self.draw_command as *const _ as *const usize
    }
}

impl Mesh {
    pub unsafe fn new(
        id:u32,
        has_bounding:bool,
        has_geometry:bool,
        positions_count:usize,
        vertices_stride:usize,
        point_light:f32,
        directional_light:f32,
        scenes:f32,
        static_faces:bool,
        strip:bool) -> Self {

        let m = Mesh {
            id,
            gpu_alignment: ENGINE.allocate_gpu(),
            gpu_mesh: GPUMesh {
                transformation: Vec4 {
                    x: Vec4 { x:1.0, y:0.0, z:0.0, w:0.0},
                    y: Vec4 { x:0.0, y:1.0, z:0.0, w:0.0},
                    z: Vec4 { x:0.0, y:0.0, z:1.0, w:0.0},
                    w: Vec4 { x:0.0, y:0.0, z:0.0, w:1.0},
                },
                delta: [0.0, 0.0, 0.0, 0.0],
                custom: [0.0, 0.0, 0.0, 0.0],
                acceleration: [0.0, 0.0, 0.0, 0.0],
                id,
                point_light_squared: point_light * point_light,
                directional_light,
                scenes: scenes as u32,
            },
            geometry: Geometry::new(has_geometry, has_bounding, vertices_stride, positions_count, static_faces,strip),
            rotation: Vec4 {
                x: 0.0,
                y: 0.0,
                z: 0.0,
                w: 0.0,
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
            
            }
        };
        if point_light > 0.0 {
            ENGINE.point_lights.push(m.gpu_alignment);
            ENGINE.update_point_lights();
        }
        if directional_light > 0.0 {
            ENGINE.directional_lights.push(m.gpu_alignment);
            ENGINE.update_directional_lights();
        }

        ENGINE.allocated_gpu_memory();

        return m;
    }
    /*pub fn draw(&self) {

    }*/
    pub unsafe fn update_dynamic_buffer(&self) {
        ENGINE.gpu_queue2.push((&self.gpu_mesh, self.gpu_alignment));
    }


    fn on_update(&mut self) {
        self.update_matrix();
        unsafe {
            self.update_dynamic_buffer();
        }
        if self.geometry.bounding_box.has_bounding {
            self.geometry.bounding_box.dirty=true;
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

    pub fn acceleration_pointer(&self) -> *const [f32; 4] {
        &self.gpu_mesh.acceleration
    }
    pub fn set_point_light(&mut self, engine:&mut Engine, range:f32) {
        self.gpu_mesh.set_point_light(engine, range, self.gpu_alignment);
    }
    pub fn set_directional_light(&mut self, engine:&mut Engine, range:f32) {
        self.gpu_mesh.set_directional_light(engine, range, self.gpu_alignment);
    }
    pub fn update_matrix(&mut self) {
        let x: f32 = self.rotation.x;
        let y: f32 = self.rotation.y;
        let z: f32 = self.rotation.z;
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

        self.gpu_mesh.transformation.x.x = (1.0 - (yy + zz)) * sx;
        self.gpu_mesh.transformation.x.y = (xy + wz) * sx;
        self.gpu_mesh.transformation.x.z = (xz - wy) * sx;

        self.gpu_mesh.transformation.y.x = (xy - wz) * sy;
        self.gpu_mesh.transformation.y.y = (1.0 - (xx + zz)) * sy;
        self.gpu_mesh.transformation.y.z = (yz + wx) * sy;

        self.gpu_mesh.transformation.z.x = (xz + wy) * sz;
        self.gpu_mesh.transformation.z.y = (yz - wx) * sz;
        self.gpu_mesh.transformation.z.z = (1.0 - (xx + yy)) * sz;
    }
}
impl Drop for Mesh {
    fn drop(&mut self) {
        unsafe {
            if self.gpu_mesh.point_light_squared > 0.0 {
                let index = ENGINE.point_lights.iter().position(|x| *x == self.gpu_alignment).unwrap();
                ENGINE.point_lights.swap_remove(index);
                ENGINE.update_point_lights();
            }
            if self.gpu_mesh.directional_light > 0.0 {
                let index = ENGINE.directional_lights.iter().position(|x| *x == self.gpu_alignment).unwrap();
                ENGINE.directional_lights.swap_remove(index);
                ENGINE.update_directional_lights();
            }
            ENGINE.de_allocate_gpu(self.gpu_alignment);
        }
    }
}