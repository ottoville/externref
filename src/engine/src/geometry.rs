pub use crate::boundingbox::BoundingBox;
use crate::{math2::{Vec4, Vec3F32}, mesh::get_mesh_by_id_mut, MULTIVALUE_USIZE};

#[no_mangle]
pub unsafe extern "C" fn bounding_vectors_pointer_simd(mesh_id: usize) -> *const usize {
    let mesh = get_mesh_by_id_mut(mesh_id);
    let mesh2 = get_mesh_by_id_mut(mesh_id);
    let transformation = mesh.get_transformation();
    let geometry = mesh2.get_geometry_mut();
    geometry.update_bounding_box(transformation);

/*
    Convert SIMD lanes to XYZ
 */
    let vectors:Vec<f32> = vec![
        geometry.bounding_box.vectors_simd[0].x.x, geometry.bounding_box.vectors_simd[0].y.x, geometry.bounding_box.vectors_simd[0].z.x, 0.0,
        geometry.bounding_box.vectors_simd[0].x.y, geometry.bounding_box.vectors_simd[0].y.y, geometry.bounding_box.vectors_simd[0].z.y, 0.0,
        geometry.bounding_box.vectors_simd[0].x.z, geometry.bounding_box.vectors_simd[0].y.z, geometry.bounding_box.vectors_simd[0].z.z, 0.0,
        geometry.bounding_box.vectors_simd[0].x.w, geometry.bounding_box.vectors_simd[0].y.w, geometry.bounding_box.vectors_simd[0].z.w, 0.0,

        geometry.bounding_box.vectors_simd[1].x.x, geometry.bounding_box.vectors_simd[1].y.x, geometry.bounding_box.vectors_simd[1].z.x, 0.0,
        geometry.bounding_box.vectors_simd[1].x.y, geometry.bounding_box.vectors_simd[1].y.y, geometry.bounding_box.vectors_simd[1].z.y, 0.0,
        geometry.bounding_box.vectors_simd[1].x.z, geometry.bounding_box.vectors_simd[1].y.z, geometry.bounding_box.vectors_simd[1].z.z, 0.0,
        geometry.bounding_box.vectors_simd[1].x.w, geometry.bounding_box.vectors_simd[1].y.w, geometry.bounding_box.vectors_simd[1].z.w, 0.0,
    ];
    let mut buf = std::mem::ManuallyDrop::new(vectors);
    MULTIVALUE_USIZE[0] = buf.as_mut_ptr() as usize;
    MULTIVALUE_USIZE[1] = buf.len();
    MULTIVALUE_USIZE[2] = buf.capacity();
    return MULTIVALUE_USIZE.as_ptr();
}
#[no_mangle]
pub unsafe extern "C" fn set_faces(mesh_id: usize, ptr: *mut Plane, length: usize, cap: usize) {
    let planes = Vec::from_raw_parts(ptr, length / 4, cap / 4);
    let geometry = get_mesh_by_id_mut(mesh_id).get_geometry_mut();
    geometry.collider_planes = Vec::with_capacity(planes.len());
    geometry.collider_planes_parallel = Vec::with_capacity(planes.len());
    geometry.faces.planes = planes;
}
#[no_mangle]
pub unsafe extern "C" fn set_indices(mesh_id: usize, ptr: *mut usize, length: usize, cap: usize) {
    let indices = Vec::from_raw_parts(ptr, length, cap);
    let geometry = get_mesh_by_id_mut(mesh_id).get_geometry_mut();
    geometry.set_indices(indices);
}
#[no_mangle]
pub unsafe extern "C" fn set_vertices(mesh_id: usize, ptr: *mut f32, length: usize, cap: usize) {
    let vertices = Vec::from_raw_parts(ptr, length, cap);
    get_mesh_by_id_mut(mesh_id)
        .get_geometry_mut()
        .set_vertices(vertices);
}
#[no_mangle]
pub unsafe extern "C" fn set_indices_and_vertices(
    mesh_id: usize,
    indices_ptr: *mut usize,
    indices_length: usize,
    indices_cap: usize,
    vertices_ptr: *mut f32,
    vertices_length: usize,
    vertices_cap: usize,
) {
    let indices = Vec::from_raw_parts(indices_ptr, indices_length, indices_cap);
    let vertices = Vec::from_raw_parts(vertices_ptr, vertices_length, vertices_cap);
    let geometry = get_mesh_by_id_mut(mesh_id).get_geometry_mut();
    geometry.indices = indices;
    geometry.set_vertices(vertices);
}
pub struct ColliderPlane {
    _plane: Plane,
    _vectors: [f32; 3],
}
pub struct Geometry {
    pub bounding_box: BoundingBox,
    pub vertices: Vec<f32>,
    pub vertices_stride: usize,
    pub indices: Vec<usize>,
    pub faces: Faces,
    pub strip: bool,

    pub collider_planes: Vec<ColliderPlane>,
    pub collider_planes_parallel: Vec<[f32; 4]>, //lanes for x,y,z,d
    pub last_collider_world_vertices: Vec<f32>,

    pub static_faces: bool, // Used for terrain
}
impl Geometry {
    pub fn new(
        has_bounding: bool,
        vertices_stride: usize,
        static_faces: bool,
        strip: bool,
    ) -> Self {
        let mut g = Geometry {
            bounding_box: BoundingBox::new(has_bounding),
            vertices: Vec::new(),
            indices: Vec::new(),
            vertices_stride,
            faces: Faces::new(0),
            collider_planes: Vec::new(),
            collider_planes_parallel: Vec::new(),
            last_collider_world_vertices: Vec::new(),
            static_faces,
            strip,
        };
        g.allocate_faces();
        return g;
    }
    pub fn faces_count(&self) -> usize {
        if self.static_faces {
            return self.faces.planes.len();
        } else {
            //TODO: Hand strip and indexed
            let position_count = if self.indices.len() > 0 {
                self.indices.len()
            } else {
                self.vertices.len() / self.vertices_stride
            };
            if position_count == 0 {
                return 0usize;
            } else if self.strip {
                position_count - 2
            } else {
                position_count / 3
            }
        }
    }
    pub fn allocate_faces(&mut self) {
        self.last_collider_world_vertices =
            Vec::with_capacity(self.vertices.len() / self.vertices_stride * 4);
        if self.static_faces {
            return;
        }
        let faces_count = self.faces_count();
        self.faces = Faces::new(faces_count);
        self.collider_planes = Vec::with_capacity(faces_count);
        self.collider_planes_parallel = Vec::with_capacity(faces_count * 4usize);
    }
    pub fn update_bounding_box(&mut self, transformation: &Vec4<Vec4<f32>>) {
        if self.bounding_box.need_init {
            self.bounding_box.init(&self.vertices, self.vertices_stride);
            self.bounding_box.transform(transformation);
        } else if self.bounding_box.dirty {
            self.bounding_box.transform(transformation);
        }
    }
    pub fn set_vertices(&mut self, vertices: Vec<f32>) {
        self.vertices = vertices;
        self.bounding_box.need_init = true;
        self.allocate_faces();
    }
    pub fn set_indices(&mut self, indices: Vec<usize>) {
        self.indices = indices;
        self.bounding_box.need_init = true;
        self.allocate_faces();
    }
}
pub struct Faces {
    pub planes: Vec<Plane>,
}

pub struct Plane {
    pub norm: [f32; 3],
    pub d: f32,
}
impl Faces {
    pub fn new(amount: usize) -> Faces {
        Faces {
            planes: Vec::with_capacity(amount),
        }
    }
}
