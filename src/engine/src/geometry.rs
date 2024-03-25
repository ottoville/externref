use std::num::NonZeroU32;

pub use crate::boundingbox::BoundingBox;
use crate::{
    create_multivalue_vector, math2::{Vec3F32, Vec4, VertexKind}, mesh::{get_mesh_by_id, get_mesh_by_id_mut}, vertices::Position, MULTIVALUE_USIZE
};
#[no_mangle]
pub unsafe extern "C" fn indices_field_pointer(geometry_ptr: *const Geometry<VertexKind>) -> *const usize {
    let geometry = &(*geometry_ptr);
    let indices = &geometry.indices;
    MULTIVALUE_USIZE[0] = indices.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = indices.len();
    MULTIVALUE_USIZE[2] = indices.capacity();
    MULTIVALUE_USIZE.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn vertices_pointer(geometry: *const Geometry<VertexKind>) -> *const f32 {
    let vertices =&(*geometry).vertices.vertices;
    match vertices {
        VertexKind::PositionAndNormalAndUV(vector) => {
            vector.as_ptr() as *const f32
        },
        VertexKind::PositionAndNormalAndColor(vector) => {
            vector.as_ptr() as *const f32
        },
        VertexKind::PositionAndNormal(vector) => {
            vector.as_ptr() as *const f32
        },
        VertexKind::Position(vector) => {
            vector.as_ptr() as *const f32
        },
        VertexKind::F32(vector) => {
            vector.as_ptr()
        },
        VertexKind::None => panic!("Asked vertices pointer but there are no vertices"),
    }
}
#[no_mangle]
pub unsafe extern "C" fn calculate_normals(geometry: *mut Geometry<VertexKind>) {
    (*geometry).calculate_normals();
}
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
    let vectors: Vec<f32> = vec![
        geometry.bounding_box.vectors_simd[0].x.x,
        geometry.bounding_box.vectors_simd[0].y.x,
        geometry.bounding_box.vectors_simd[0].z.x,
        0.0,
        geometry.bounding_box.vectors_simd[0].x.y,
        geometry.bounding_box.vectors_simd[0].y.y,
        geometry.bounding_box.vectors_simd[0].z.y,
        0.0,
        geometry.bounding_box.vectors_simd[0].x.z,
        geometry.bounding_box.vectors_simd[0].y.z,
        geometry.bounding_box.vectors_simd[0].z.z,
        0.0,
        geometry.bounding_box.vectors_simd[0].x.w,
        geometry.bounding_box.vectors_simd[0].y.w,
        geometry.bounding_box.vectors_simd[0].z.w,
        0.0,
        geometry.bounding_box.vectors_simd[1].x.x,
        geometry.bounding_box.vectors_simd[1].y.x,
        geometry.bounding_box.vectors_simd[1].z.x,
        0.0,
        geometry.bounding_box.vectors_simd[1].x.y,
        geometry.bounding_box.vectors_simd[1].y.y,
        geometry.bounding_box.vectors_simd[1].z.y,
        0.0,
        geometry.bounding_box.vectors_simd[1].x.z,
        geometry.bounding_box.vectors_simd[1].y.z,
        geometry.bounding_box.vectors_simd[1].z.z,
        0.0,
        geometry.bounding_box.vectors_simd[1].x.w,
        geometry.bounding_box.vectors_simd[1].y.w,
        geometry.bounding_box.vectors_simd[1].z.w,
        0.0,
    ];
    return create_multivalue_vector(vectors);
}
#[no_mangle]
pub unsafe extern "C" fn set_faces(mesh_id: usize, ptr: *mut Plane, length: usize, cap: usize) {
    let planes = Vec::from_raw_parts(ptr, length / 4, cap / 4);
    let geometry = get_mesh_by_id_mut(mesh_id).get_geometry_mut();
    geometry.collider_planes = Vec::with_capacity(planes.len());
    geometry.collider_planes_parallel = Vec::with_capacity(planes.len());
    geometry.planes.planes = planes;
}
#[no_mangle]
pub unsafe extern "C" fn set_indices(geometry_ptr: *mut Geometry<VertexKind>, ptr: *mut u32, length: usize, cap: usize) {
    let indices = Vec::from_raw_parts(ptr, length, cap);
    let geometry = &mut(*geometry_ptr);
    geometry.set_indices(indices);
}
#[no_mangle]
pub unsafe extern "C" fn set_vertices(
    geometry_ptr: *mut Geometry<VertexKind>,
    ptr: *mut f32,
    length: usize,
    cap: usize,
    vertices_stride: usize,
) {
    let vertices: Vec<f32> = Vec::from_raw_parts(ptr, length, cap);
    let geometry = &mut(*geometry_ptr);
    geometry.set_vertices(VertexKind::F32(vertices), vertices_stride);
}
#[no_mangle]
pub unsafe extern "C" fn set_position_vertices(
    geometry_ptr: *mut Geometry<VertexKind>,
    ptr: *mut Position,
    length: usize,
    cap: usize,
    vertices_stride: usize,
) {

    let vertices: Vec<Position> = Vec::from_raw_parts(ptr, length, cap);
    let geometry = &mut(*geometry_ptr);
    geometry.set_vertices(VertexKind::Position(vertices), vertices_stride);
}
#[no_mangle]
pub unsafe extern "C" fn vertices_count(geometry_ptr: *const Geometry<VertexKind>) -> usize {
    let geometry = &(*geometry_ptr);
    geometry.vertices.length()
}
#[no_mangle]
pub unsafe extern "C" fn have_vertices(mesh_id: usize) -> bool {
    let mesh = get_mesh_by_id(mesh_id);
    mesh.get_geometry().vertices.have_vertices()
}
#[no_mangle]
pub unsafe extern "C" fn set_indices_and_vertices(
    mesh_id: usize,
    indices_ptr: *mut u32,
    indices_length: usize,
    indices_cap: usize,
    vertices_ptr: *mut f32,
    vertices_length: usize,
    vertices_cap: usize,
    vertices_stride: usize,
) {
    let indices = Vec::from_raw_parts(indices_ptr, indices_length, indices_cap);
    let vertices = Vec::from_raw_parts(vertices_ptr, vertices_length, vertices_cap);
    let geometry = get_mesh_by_id_mut(mesh_id).get_geometry_mut();
    geometry.indices = indices;
    geometry.set_vertices(VertexKind::F32(vertices), vertices_stride);
    geometry.faces_dirty = true;
}

pub struct ColliderPlane {
    _plane: Plane,
    _vectors: [f32; 3],
}
pub struct Vertices<T> {
    pub vertices: T,
    /**
     * stride as DWORD in vertices vec.
     */
    pub vertices_stride: usize,
}

impl Vertices<VertexKind> {
    pub fn have_vertices(&self) -> bool {
        match self.vertices {
            VertexKind::None => false,
            _ => true
        }
    }
    pub fn length(&self) -> usize {
        return match &self.vertices {
            VertexKind::PositionAndNormalAndUV(vector) => {
                vector.len()
            },
            VertexKind::PositionAndNormalAndColor(vector) => {
                vector.len()
            },
            VertexKind::PositionAndNormal(vector) => {
                vector.len()
            },
            VertexKind::Position(vector) => {
                vector.len()
            },
            VertexKind::F32(vector) => {
                vector.len()/self.vertices_stride
            },
            VertexKind::None => 0,
        }
    }
}
pub struct Geometry<T> {
    pub bounding_box: BoundingBox,
    pub vertices: Vertices<T>,
    pub indices: Vec<u32>,
    pub faces: Vec<[u32; 3]>,
    pub faces_dirty: bool,
    pub planes: Faces,
    pub strip: bool,
    pub label: String,

    pub collider_planes: Vec<ColliderPlane>,
    pub collider_planes_parallel: Vec<[f32; 4]>, //lanes for x,y,z,d
    pub last_collider_world_vertices: Vec<f32>,

    pub static_faces: bool, // Used for terrain
    pub character_can_collide_to: bool,
}

impl<'vert> Geometry<VertexKind> {
    pub fn get_positions(&'static self) -> Box<dyn Iterator<Item = &'static Vec3F32>> {
        match &self.vertices.vertices {
            VertexKind::PositionAndNormalAndUV(vector) => {
                Box::new(vector.iter().map(|v| { &v.position}))
            },
            VertexKind::PositionAndNormalAndColor(vector) => {
                Box::new(vector.iter().map(|v| { &v.position}))
            },
            VertexKind::PositionAndNormal(vector) => {
                Box::new(vector.iter().map(|v| { &v.position}))
            },
            VertexKind::Position(vector) => {
                Box::new(vector.iter().map(|v| { &v.position}))
            },
            VertexKind::F32(vector) => {
                Box::new(vector.chunks_exact(self.vertices.vertices_stride).map(|v| unsafe {
                    &(*(v.as_ptr() as *const Vec3F32))
                }))
            },
            VertexKind::None => todo!(),
        }
    }
    pub fn get_positions_mut(&'static mut self) -> Box<dyn Iterator<Item = &'static mut Vec3F32>> {
        match &mut self.vertices.vertices {
            VertexKind::PositionAndNormalAndUV(vector) => {
                Box::new(vector.iter_mut().map(|v| { &mut v.position}))
            },
            VertexKind::PositionAndNormalAndColor(vector) => {
                Box::new(vector.iter_mut().map(|v| { &mut v.position}))
            },
            VertexKind::PositionAndNormal(vector) => {
                Box::new(vector.iter_mut().map(|v| { &mut v.position}))
            },
            VertexKind::Position(vector) => {
                Box::new(vector.iter_mut().map(|v| { &mut v.position}))
            },
            VertexKind::F32(vector) => {
                Box::new(vector.chunks_exact_mut(self.vertices.vertices_stride).map(|v| unsafe {
                    &mut (*(v.as_mut_ptr() as *mut Vec3F32))
                }))
            },
            VertexKind::None => todo!(),
        }
    }
    pub fn calculate_normals(&mut self) {
        if let VertexKind::Position(_) = &self.vertices.vertices {

        } else if let VertexKind::None = &self.vertices.vertices {

        } else {
            self.create_faces(None);
            let mut positions: Vec<_> = match &mut self.vertices.vertices {
                VertexKind::PositionAndNormalAndUV(vector) => {
                    vector.iter_mut().map(|v| {
                        v.normal.clear();
                        return (&v.position, &mut v.normal);
                    }).collect()
                },
                VertexKind::PositionAndNormalAndColor(vector) => {
                    vector.iter_mut().map(|v| {
                        v.normal.clear();
                        return (&v.position, &mut v.normal);
                    }).collect()
                },
                VertexKind::PositionAndNormal(vector) => {
                    vector.iter_mut().map(|v| {
                        v.normal.clear();
                        return (&v.position, &mut v.normal);
                    }).collect()
                },
                VertexKind::Position(_) => {
                    panic!("Guard should prevent executing this line")
                },
                VertexKind::F32(_) => {
                    todo!()
                },
                VertexKind::None => panic!("Guard should prevent executing this line"),
            };
    
            for triangle in self.faces.iter() {
                let ia = &positions[triangle[0] as usize];
                let ib = &positions[triangle[1] as usize];
                let ic = &positions[triangle[2] as usize];

                let e1 = ia.0.sub(ib.0);
                let e2 =  ic.0.sub(ib.0);

                let no = e1.cross(&e2);

                positions[triangle[0] as usize].1.add_vec_in_place(&no);
                positions[triangle[1] as usize].1.add_vec_in_place(&no);
                positions[triangle[2] as usize].1.add_vec_in_place(&no);
            }
            for position in positions {
                position.1.normalize();
            }
        }
    }
    pub fn new(
        has_bounding: bool,
        character_can_collide_to: bool,
        static_faces: bool,
        strip: bool,
        label: String,
    ) -> Self {
        Geometry {
            bounding_box: BoundingBox::new(has_bounding),
            vertices: Vertices {
                vertices: VertexKind::None,
                vertices_stride: 0
            },
            indices: Vec::new(),
            faces: Vec::new(),
            faces_dirty: true,
            planes: Faces::new(0),
            collider_planes: Vec::new(),
            collider_planes_parallel: Vec::new(),
            last_collider_world_vertices: Vec::new(),
            static_faces,
            strip,
            character_can_collide_to,
            label
        }
    }
    pub fn create_faces(&mut self, override_positions_count: Option<NonZeroU32>) {
        if !self.faces_dirty {
            return;
        }
        self.faces.clear();
        if self.indices.len() == 0 {
            if self.strip {
                panic!("Unindexed Trimesh collider with triangle strip is not yet supported");
            }
            let mut pos = 0;

            let positions_count: u32;
            if let Some(pos_count) = override_positions_count {
                positions_count = u32::from(pos_count) 
            } else {
                positions_count = self.vertices.length() as u32;
                if positions_count == 0 {
                    panic!("Faces needs either indices or vertices");
                }
            }
            self.faces.shrink_to_fit();
            while pos < positions_count {
                self.faces.push([pos, pos + 1, pos + 2]);
                pos = pos + 3;
            }
        } else {
            if self.strip {
                // Length is self.indices.len() - 2
                self.faces = self.indices.windows(3).map(|i| i.try_into().unwrap()).collect();
            } else {
                // Lenght is self.indices.len() / 3
                self.faces = self.indices.chunks_exact(3).map(|i| i.try_into().unwrap()).collect();
            }
        }
        self.faces_dirty = false
    }
    pub fn faces_count(&self) -> usize {
        if self.static_faces {
            return self.planes.planes.len();
        } else {
            //TODO: Hand strip and indexed
            let position_count = if self.indices.len() > 0 {
                self.indices.len()
            } else {
                 self.vertices.length()
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
        if self.vertices.have_vertices() {
            self.last_collider_world_vertices =
                Vec::with_capacity((self.vertices.length()) * 4);
            if self.static_faces {
                return;
            }
            let faces_count = self.faces_count();
            self.planes = Faces::new(faces_count);
            self.collider_planes = Vec::with_capacity(faces_count);
            self.collider_planes_parallel = Vec::with_capacity(faces_count * 4usize);
        }
    }
    pub fn update_bounding_box(&mut self, transformation: &Vec4<Vec4<f32>>) {
        if self.bounding_box.need_init {            
            self.bounding_box.init(&self.vertices);
            self.bounding_box.transform(transformation);
        } else if self.bounding_box.dirty {
            self.bounding_box.transform(transformation);
        }
    }
    pub fn set_vertices(&mut self, vertices: VertexKind, vertices_stride: usize) {
        self.vertices = Vertices {
            vertices,
            vertices_stride,
        };
        self.bounding_box.need_init = true;
        if self.character_can_collide_to {
            self.allocate_faces();
        }
    }
    /**
     * Set indices to geometry
     */
    pub fn set_indices(&mut self, indices: Vec<u32>) {
        self.indices = indices;
        self.bounding_box.need_init = true;
        if self.character_can_collide_to {
            self.allocate_faces();
        }
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
