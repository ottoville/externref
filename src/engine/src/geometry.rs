use std::num::NonZeroU32;

use rapier3d::{
    geometry::{Collider, ColliderBuilder},
    math::Point,
    na::{Const, OPoint},
    pipeline::ActiveEvents,
};
use terramath::{CrossProduct, VectorMath};

pub use crate::boundingbox::BoundingBox;
use crate::{
    create_multivalue_vector,
    mesh::{get_mesh_by_id, get_mesh_by_id_mut},
    vertices::{Position, PositionAndNormal, VertexKind, Vertices},
    MULTIVALUE_USIZE,
};
#[no_mangle]
pub unsafe extern "C" fn indices_field_pointer(geometry_ptr: *const Geometry) -> *const usize {
    let geometry = &(*geometry_ptr);
    let indices = &geometry.indices;
    MULTIVALUE_USIZE[0] = indices.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = indices.len();
    MULTIVALUE_USIZE[2] = indices.capacity();
    MULTIVALUE_USIZE.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn vertices_pointer(geometry: *const Geometry) -> *const f32 {
    let vertices = &(*geometry).vertices.vertices;
    match vertices {
        VertexKind::PositionAndNormalAndUV(vector) => vector.as_ptr() as *const f32,
        VertexKind::PositionAndNormalAndColor(vector) => vector.as_ptr() as *const f32,
        VertexKind::PositionAndNormal(vector) => vector.as_ptr() as *const f32,
        VertexKind::Position(vector) => vector.as_ptr() as *const f32,
        VertexKind::F32(vector) => vector.as_ptr(),
        VertexKind::None => panic!("Asked vertices pointer but there are no vertices"),
    }
}

#[no_mangle]
pub unsafe extern "C" fn bounding_vectors_pointer_simd(mesh_id: usize) -> *const usize {
    let mesh = get_mesh_by_id_mut(mesh_id);
    let mesh2 = get_mesh_by_id_mut(mesh_id);
    let mut mesh_property = mesh.mesh_property.lock().unwrap();
    let transformation = mesh_property.get_transformation();

    let geometry = mesh2.get_geometry_mut();
    geometry.update_bounding_box(transformation);

    /*
       Convert SIMD lanes to XYZ
    */
    let vectors: Vec<f32> = vec![
        geometry.bounding_box.vectors_simd[0][0][0],
        geometry.bounding_box.vectors_simd[0][1][0],
        geometry.bounding_box.vectors_simd[0][2][0],
        0.0,
        geometry.bounding_box.vectors_simd[0][0][1],
        geometry.bounding_box.vectors_simd[0][1][1],
        geometry.bounding_box.vectors_simd[0][2][1],
        0.0,
        geometry.bounding_box.vectors_simd[0][0][2],
        geometry.bounding_box.vectors_simd[0][1][2],
        geometry.bounding_box.vectors_simd[0][2][2],
        0.0,
        geometry.bounding_box.vectors_simd[0][0][3],
        geometry.bounding_box.vectors_simd[0][1][3],
        geometry.bounding_box.vectors_simd[0][2][3],
        0.0,
        geometry.bounding_box.vectors_simd[1][0][0],
        geometry.bounding_box.vectors_simd[1][1][0],
        geometry.bounding_box.vectors_simd[1][2][0],
        0.0,
        geometry.bounding_box.vectors_simd[1][0][1],
        geometry.bounding_box.vectors_simd[1][1][1],
        geometry.bounding_box.vectors_simd[1][2][1],
        0.0,
        geometry.bounding_box.vectors_simd[1][0][2],
        geometry.bounding_box.vectors_simd[1][1][2],
        geometry.bounding_box.vectors_simd[1][2][2],
        0.0,
        geometry.bounding_box.vectors_simd[1][0][3],
        geometry.bounding_box.vectors_simd[1][1][3],
        geometry.bounding_box.vectors_simd[1][2][3],
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
pub unsafe extern "C" fn set_indices(
    geometry_ptr: *mut Geometry,
    ptr: *mut u32,
    length: usize,
    cap: usize,
) {
    let indices = Vec::from_raw_parts(ptr, length, cap);
    let geometry = &mut (*geometry_ptr);
    geometry.set_indices(indices);
}
#[no_mangle]
pub unsafe extern "C" fn set_vertices(
    geometry_ptr: *mut Geometry,
    ptr: *mut f32,
    length: usize,
    cap: usize,
    vertices_stride: usize,
) {
    let vertices: Vec<f32> = Vec::from_raw_parts(ptr, length, cap);
    let geometry = &mut (*geometry_ptr);
    geometry.set_vertices(VertexKind::F32(vertices), vertices_stride);
}
#[no_mangle]
pub unsafe extern "C" fn set_position_vertices(
    geometry_ptr: *mut Geometry,
    ptr: *mut Position,
    length: usize,
    cap: usize,
    vertices_stride: usize,
) {
    let vertices: Vec<Position> = Vec::from_raw_parts(ptr, length, cap);
    let geometry = &mut (*geometry_ptr);
    geometry.set_vertices(VertexKind::Position(vertices), vertices_stride);
}
#[no_mangle]
pub unsafe extern "C" fn set_position_and_normal_vertices(
    geometry_ptr: *mut Geometry,
    ptr: *mut PositionAndNormal,
    length: usize,
    cap: usize,
    vertices_stride: usize,
) {
    let vertices: Vec<PositionAndNormal> = Vec::from_raw_parts(ptr, length, cap);
    let geometry = &mut (*geometry_ptr);
    geometry.set_vertices(VertexKind::PositionAndNormal(vertices), vertices_stride);
}
#[no_mangle]
pub unsafe extern "C" fn vertices_count(geometry_ptr: *const Geometry) -> usize {
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
#[no_mangle]
pub unsafe extern "C" fn dedup_positions(geometry_ptr: *mut Geometry) {
    (*geometry_ptr).dedup_positions();
}
pub struct ColliderPlane {
    _plane: Plane,
    _vectors: [f32; 3],
}
pub struct Geometry {
    pub bounding_box: BoundingBox,
    pub vertices: Vertices,
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

fn dedup_index(old: u32, new: u32, indices: &mut Vec<u32>) {
    for indice in indices.iter_mut() {
        if *indice == old as u32 {
            *indice = new as u32
        } else if *indice > old as u32 {
            *indice = *indice - 1
        }
    }
}

impl<'vert> Geometry {
    pub fn create_trimesh_collider(&mut self, scaling: [f32; 3]) -> *mut Collider {
        let newvertices = self
            .vertices
            .get_positions()
            .map(|position| {
                Point::new(
                    position.vec[0] * scaling[0],
                    position.vec[1] * scaling[1],
                    position.vec[2] * scaling[2],
                )
            })
            .collect();
        let positions_count = self.vertices.length();
        self.create_faces(NonZeroU32::new(positions_count as u32));
        let collider = Box::new(
            ColliderBuilder::trimesh(newvertices, self.faces.clone())
                .density(2.0)
                .restitution(0.5)
                .build(),
        );
        Box::leak(collider)
    }
    pub fn create_convex_collider(
        &mut self,
        collision_events: bool,
        scaling: [f32; 3],
    ) -> *mut Collider {
        let positions = self.vertices.get_positions();

        let mut new_indices = self.indices.clone();
        let mut new_vertices: Vec<OPoint<f32, Const<3>>> = Vec::new();
        /*
         * Scale vertices and remove remove duplicated positions
         */
        for position in positions {
            let point = Point::new(
                position.vec[0] * scaling[0],
                position.vec[1] * scaling[1],
                position.vec[2] * scaling[2],
            );
            if let Some(n) = new_vertices.iter().position(|oldpos| oldpos.eq(&point)) {
                dedup_index(new_vertices.len() as u32, n as u32, &mut new_indices);
            } else {
                new_vertices.push(point);
            }
        }
        let indices: Vec<[u32; 3]> = new_indices
            .chunks_exact(3)
            .map(|i| i.try_into().unwrap())
            .collect();

        let colliderbuilder = ColliderBuilder::convex_mesh(new_vertices, &indices);
        match colliderbuilder {
            Some(mut builder) => {
                if collision_events {
                    builder = builder.active_events(ActiveEvents::COLLISION_EVENTS);
                }
                Box::leak(Box::new(builder.build()))
            }
            None => {
                panic!("Failure to create convex collider")
            }
        }
    }
    pub fn calculate_normals(&mut self) {
        self.create_faces(Option::None);
        if let VertexKind::Position(_) = &self.vertices.vertices {
        } else if let VertexKind::None = &self.vertices.vertices {
        } else {
            //self.create_faces(None);
            match &mut self.vertices.vertices {
                VertexKind::PositionAndNormalAndUV(positions) => {
                    for position in &mut *positions {
                        position.normal.vec.clear();
                    }
                    for triangle in self.faces.iter() {
                        let ia = &positions[triangle[0] as usize].position.vec;
                        let ib = &positions[triangle[1] as usize].position.vec;
                        let ic = &positions[triangle[2] as usize].position.vec;

                        let e1 = ia.sub_vec(&ib);
                        let e2 = ic.sub_vec(&ib);

                        let no = e1.cross(&e2);

                        positions[triangle[0] as usize]
                            .normal
                            .vec
                            .add_vec_in_place(&no);
                        positions[triangle[1] as usize]
                            .normal
                            .vec
                            .add_vec_in_place(&no);
                        positions[triangle[2] as usize]
                            .normal
                            .vec
                            .add_vec_in_place(&no);
                    }
                    for position in positions {
                        position.normal.vec.normalize_in_place();
                    }
                }
                VertexKind::PositionAndNormalAndColor(positions) => {
                    for position in &mut *positions {
                        position.normal.vec.clear();
                    }
                    for triangle in self.faces.iter() {
                        let ia = &positions[triangle[0] as usize].position.vec;
                        let ib = &positions[triangle[1] as usize].position.vec;
                        let ic = &positions[triangle[2] as usize].position.vec;

                        let e1 = ia.sub_vec(&ib);
                        let e2 = ic.sub_vec(&ib);

                        let no = e1.cross(&e2);

                        positions[triangle[0] as usize]
                            .normal
                            .vec
                            .add_vec_in_place(&no);
                        positions[triangle[1] as usize]
                            .normal
                            .vec
                            .add_vec_in_place(&no);
                        positions[triangle[2] as usize]
                            .normal
                            .vec
                            .add_vec_in_place(&no);
                    }
                    for position in positions {
                        position.normal.vec.normalize_in_place();
                    }
                }
                VertexKind::PositionAndNormal(positions) => {
                    for position in &mut *positions {
                        position.normal.vec.clear();
                    }
                    for triangle in self.faces.iter() {
                        let ia = &positions[triangle[0] as usize].position.vec;
                        let ib = &positions[triangle[1] as usize].position.vec;
                        let ic = &positions[triangle[2] as usize].position.vec;

                        let e1 = ia.sub_vec(&ib);
                        let e2 = ic.sub_vec(&ib);

                        let no = e1.cross(&e2);

                        positions[triangle[0] as usize]
                            .normal
                            .vec
                            .add_vec_in_place(&no);
                        positions[triangle[1] as usize]
                            .normal
                            .vec
                            .add_vec_in_place(&no);
                        positions[triangle[2] as usize]
                            .normal
                            .vec
                            .add_vec_in_place(&no);
                    }
                    for position in positions {
                        position.normal.vec.normalize_in_place();
                    }
                }
                VertexKind::Position(_) => {
                    panic!("Guard should prevent executing this line")
                }
                VertexKind::F32(_) => {
                    todo!()
                }
                VertexKind::None => panic!("Guard should prevent executing this line"),
            };
        }
    }
    /**
       Removes duplicated positions
    **/
    pub fn dedup_positions(&mut self) {
        match &mut self.vertices.vertices {
            VertexKind::PositionAndNormalAndUV(_) => {
                todo!()
            }
            VertexKind::PositionAndNormalAndColor(_) => {
                todo!()
            }
            VertexKind::PositionAndNormal(vector) => {
                let mut i = 0;
                loop {
                    if i == vector.len() {
                        break;
                    }
                    let mut ii = i + 1;
                    loop {
                        if ii == vector.len() {
                            break;
                        }
                        let pos = &vector[i].position;
                        let nextpos = &vector[ii].position;
                        if pos.vec[0] == nextpos.vec[0]
                            && pos.vec[1] == nextpos.vec[1]
                            && pos.vec[2] == nextpos.vec[2]
                        {
                            vector.remove(ii);
                            dedup_index(ii as u32, i as u32, &mut self.indices);
                            continue;
                        }
                        ii = ii + 1;
                    }
                    i = i + 1;
                }
            }
            VertexKind::Position(_) => {
                todo!()
            }
            VertexKind::F32(_) => {
                todo!()
            }
            VertexKind::None => todo!(),
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
                vertices_stride: 0,
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
            label,
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
                self.faces = self
                    .indices
                    .windows(3)
                    .map(|i| i.try_into().unwrap())
                    .collect();
            } else {
                // Lenght is self.indices.len() / 3
                self.faces = self
                    .indices
                    .chunks_exact(3)
                    .map(|i| i.try_into().unwrap())
                    .collect();
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
    pub fn allocate_collider_planes(&mut self) {
        if self.vertices.have_vertices() {
            self.last_collider_world_vertices = Vec::with_capacity((self.vertices.length()) * 4);
            if self.static_faces {
                return;
            }
            let faces_count = self.faces_count();
            self.planes = Faces::new(faces_count);
            self.collider_planes = Vec::with_capacity(faces_count);
            self.collider_planes_parallel = Vec::with_capacity(faces_count * 4usize);
        }
    }
    pub fn update_bounding_box(&mut self, transformation: &[[f32; 4]; 4]) {
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
            self.allocate_collider_planes();
        }
    }
    /**
     * Set indices to geometry
     */
    pub fn set_indices(&mut self, indices: Vec<u32>) {
        self.indices = indices;
        self.bounding_box.need_init = true;
        if self.character_can_collide_to {
            self.allocate_collider_planes();
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
