use std::num::NonZeroUsize;

use rapier3d::{
    geometry::{Collider, ColliderBuilder},
    math::Point,
    na::{Const, OPoint},
    pipeline::ActiveEvents,
};
use terramath::{CrossProduct, Plane, VectorMath};

pub use crate::boundingbox::BoundingBox;
use crate::{
    indices::Indices,
    math2::{Vec2wgslF32, Vec3wgslF32},
    mesh::ENGINE,
    vertices::{Position, Position2DAndUV, PositionAndNormal, PositionAndNormalAndUV, VertexKind},
    MULTIVALUE_USIZE,
};
#[no_mangle]
pub unsafe extern "C" fn indices_pointer_from_geometry(
    geometry_ptr: *mut Geometry,
) -> *mut Indices {
    let geometry = &mut (*geometry_ptr);
    &mut geometry.indices as *mut Indices
}
#[no_mangle]
pub unsafe extern "C" fn indices_field_pointer(geometry_ptr: *const Geometry) -> *const usize {
    let geometry = &(*geometry_ptr);
    let indices = &geometry.indices;
    MULTIVALUE_USIZE[0] = indices.indices.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = indices.indices.len();
    MULTIVALUE_USIZE[2] = indices.indices.capacity();
    MULTIVALUE_USIZE.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn vertices_pointer(geometry: *const Geometry) -> *const f32 {
    let vertices = &(*geometry).vertices;
    match vertices {
        VertexKind::PositionAndNormalAndUV(vector) => vector.as_ptr() as *const f32,
        VertexKind::PositionAndNormalAndColor(vector) => vector.as_ptr() as *const f32,
        VertexKind::PositionAndNormal(vector) => vector.as_ptr() as *const f32,
        VertexKind::Position2DAndUV(vector) => vector.as_ptr() as *const f32,
        VertexKind::Position(vector) => vector.as_ptr() as *const f32,
        VertexKind::None => panic!("Asked vertices pointer but there are no vertices"),
    }
}
/**
 * stride as DWORD in vertices vec.
 */
#[no_mangle]
pub unsafe extern "C" fn vertices_stride(geometry: *const Geometry) -> usize {
    (*geometry).vertices.vertices_stride() / 4usize
}

#[no_mangle]
pub unsafe extern "C" fn collisions_transform_matrix_ptr(
    geometry: *const Geometry,
) -> *const [[f32; 4]; 4] {
    &(*geometry).collisions_transform_matrix
}
#[no_mangle]
pub unsafe extern "C" fn update_collider_planes(geometry: *mut Geometry) {
    (*geometry).update_collider_planes();
}
#[no_mangle]
pub unsafe extern "C" fn last_collider_world_vertices_pointer(
    geometry: *mut Geometry,
) -> *const Vec3wgslF32 {
    (*geometry).last_collider_world_vertices.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn set_faces(mesh_id: usize, ptr: *mut Plane, length: usize, cap: usize) {
    let planes = Vec::from_raw_parts(ptr, length / 4, cap / 4);
    let engine = &mut ENGINE.engine2.lock().unwrap();
    let geometry = engine.meshes[mesh_id].get_geometry_mut();
    geometry.collider_planes = Vec::with_capacity(planes.len());
    geometry.collider_planes_parallel = Vec::with_capacity(planes.len());
    geometry.planes.planes = planes;
}
#[no_mangle]
pub unsafe extern "C" fn set_position_vertices(
    geometry_ptr: *mut Geometry,
    ptr: *mut Position,
    length: usize,
    cap: usize,
) {
    let vertices: Vec<Position> = Vec::from_raw_parts(ptr, length, cap);
    let geometry = &mut (*geometry_ptr);
    geometry.set_vertices(VertexKind::Position(vertices));
}
#[no_mangle]
pub unsafe extern "C" fn set_position_and_normal_vertices(
    geometry_ptr: *mut Geometry,
    ptr: *mut PositionAndNormal,
    length: usize,
    cap: usize,
) {
    let vertices: Vec<PositionAndNormal> = Vec::from_raw_parts(ptr, length, cap);
    let geometry = &mut (*geometry_ptr);
    geometry.set_vertices(VertexKind::PositionAndNormal(vertices));
}
#[no_mangle]
pub unsafe extern "C" fn vertices_count(geometry_ptr: *const Geometry) -> usize {
    let geometry = &(*geometry_ptr);
    geometry.vertices.length()
}
#[no_mangle]
pub unsafe extern "C" fn have_vertices(mesh_id: usize) -> bool {
    let mesh = &ENGINE.engine2.lock().unwrap().meshes[mesh_id];
    mesh.get_geometry().vertices.have_vertices()
}
#[no_mangle]
pub unsafe extern "C" fn set_indices_and_vertices_PositionAndNormalAndUV(
    mesh_id: usize,
    indices_ptr: *mut usize,
    indices_length: usize,
    indices_cap: usize,
    vertices_ptr: *mut PositionAndNormalAndUV,
    vertices_length: usize,
    vertices_cap: usize,
) {
    let indices = Vec::from_raw_parts(indices_ptr, indices_length, indices_cap);
    let vertices = Vec::from_raw_parts(vertices_ptr, vertices_length, vertices_cap);
    let engine = &mut ENGINE.engine2.lock().unwrap();

    let geometry = engine.meshes[mesh_id].get_geometry_mut();
    geometry.indices = Indices {
        indices,
        gpu_buffer: None,
    };
    geometry.set_vertices(VertexKind::PositionAndNormalAndUV(vertices));
    geometry.faces_dirty = true;
}
#[no_mangle]
pub unsafe extern "C" fn dedup_positions(geometry_ptr: *mut Geometry) {
    (*geometry_ptr).dedup_positions();
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
pub extern "C" fn create_legacy_terrain_geometry(
    has_bounding: bool,
    character_can_collide_to: bool,
    static_faces: bool,
    strip: bool,
) -> *mut Geometry {
    let mut geometry = Box::new(Geometry::new(
        has_bounding,
        character_can_collide_to,
        static_faces,
        strip,
        "legacy_terrain".to_string(),
    ));
    geometry.set_vertices(VertexKind::PositionAndNormalAndUV(vec![
        PositionAndNormalAndUV {
            position: Vec3wgslF32::new_zero(),
            normal: Vec3wgslF32::new_zero(),
            uv: Vec2wgslF32 { vec: [0.0; 2] },
        },
    ]));
    geometry.set_indices(vec![0, 0, 0]);
    Box::into_raw(geometry)
}
#[no_mangle]
pub unsafe extern "C" fn create_ui_geometry(position_count: usize) -> *mut Geometry {
    let mut geometry = Box::new(Geometry::new(false, false, false, false, "UI".to_string()));

    let mut vertices: Vec<Position2DAndUV> = Vec::with_capacity(position_count);
    vertices.set_len(position_count);
    geometry.set_vertices(VertexKind::Position2DAndUV(vertices));
    Box::into_raw(geometry)
}

#[no_mangle]
pub unsafe extern "C" fn update_colliderplane(collider_plane: *mut ColliderPlane) {
    let v0 = (*((*collider_plane).vectors[0] as *mut Vec3wgslF32)).0;
    let v1 = (*((*collider_plane).vectors[1] as *mut Vec3wgslF32)).0;
    let v2 = (*((*collider_plane).vectors[2] as *mut Vec3wgslF32)).0;
    (*collider_plane).plane.update_from_triangle([v0, v1, v2]);
}
pub struct ColliderPlane {
    plane: Plane,
    vectors: [usize; 3],
}
pub struct Geometry {
    pub bounding_box: BoundingBox,
    pub vertices: VertexKind,
    pub indices: Indices,
    pub faces: Vec<[usize; 3]>,
    pub faces_dirty: bool,
    pub planes: Faces,
    pub strip: bool,
    pub label: String,
    pub collider_planes: Vec<ColliderPlane>,
    pub collider_planes_parallel: Vec<[f32; 4]>, //lanes for x,y,z,d
    pub last_collider_world_vertices: Vec<Vec3wgslF32>,
    pub collisions_transform_matrix: [[f32; 4]; 4],

    pub static_faces: bool, // Used for terrain
    pub character_can_collide_to: bool,
}

fn dedup_index(old: usize, new: usize, indices: &mut Vec<usize>) {
    for indice in indices.iter_mut() {
        if *indice == old {
            *indice = new
        } else if *indice > old {
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
                    position.0[0] * scaling[0],
                    position.0[1] * scaling[1],
                    position.0[2] * scaling[2],
                )
            })
            .collect();
        let positions_count = self.vertices.length();
        self.create_faces(NonZeroUsize::new(positions_count));
        let collider = Box::new(
            ColliderBuilder::trimesh(
                newvertices,
                self.faces
                    .iter()
                    .map(|v| [v[0] as u32, v[1] as u32, v[2] as u32])
                    .collect(),
            )
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

        let mut new_indices = self.indices.indices.clone();
        let mut new_vertices: Vec<OPoint<f32, Const<3>>> = Vec::new();
        /*
         * Scale vertices and remove remove duplicated positions
         */
        for position in positions {
            let point = Point::new(
                position.0[0] * scaling[0],
                position.0[1] * scaling[1],
                position.0[2] * scaling[2],
            );
            if let Some(n) = new_vertices.iter().position(|oldpos| oldpos.eq(&point)) {
                dedup_index(new_vertices.len(), n, &mut new_indices);
            } else {
                new_vertices.push(point);
            }
        }
        let indices: Vec<[u32; 3]> = new_indices
            .chunks_exact(3)
            .map(|i| [i[0] as u32, i[1] as u32, i[2] as u32])
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

        for normal in self.vertices.get_normals_mut() {
            normal.0.clear();
        }
        for triangle in self.faces.iter() {
            let ia = self.vertices.get_position(triangle[0]).0;
            let ib = self.vertices.get_position(triangle[1]).0;
            let ic = self.vertices.get_position(triangle[2]).0;

            //TODO: check if frontface is cw or ccw
            let e1 = ia.sub_vec(&ib);
            let e2 = ic.sub_vec(&ib);

            let no = e1.cross(&e2);

            self.vertices
                .get_normal_mut(triangle[0])
                .0
                .add_vec_in_place(&no);
            self.vertices
                .get_normal_mut(triangle[1])
                .0
                .add_vec_in_place(&no);
            self.vertices
                .get_normal_mut(triangle[2])
                .0
                .add_vec_in_place(&no);
        }
        for normal in self.vertices.get_normals_mut() {
            normal.0.normalize_in_place();
        }
    }

    /**
       Removes duplicated positions
    **/
    pub fn dedup_positions(&mut self) {
        match &mut self.vertices {
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
                        if pos.0[0] == nextpos.0[0]
                            && pos.0[1] == nextpos.0[1]
                            && pos.0[2] == nextpos.0[2]
                        {
                            vector.remove(ii);
                            dedup_index(ii, i, &mut self.indices.indices);
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
            VertexKind::None => todo!(),
            VertexKind::Position2DAndUV(_) => todo!(),
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
            vertices: VertexKind::None,
            indices: Indices {
                indices: Vec::new(),
                gpu_buffer: None,
            },
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
            collisions_transform_matrix: [[0.0; 4]; 4],
        }
    }
    pub fn create_faces(&mut self, override_positions_count: Option<NonZeroUsize>) {
        if !self.faces_dirty {
            return;
        }
        self.faces.clear();
        if self.indices.indices.len() == 0 {
            if self.strip {
                panic!("Unindexed Trimesh collider with triangle strip is not yet supported");
            }
            let mut pos = 0usize;

            let positions_count: usize;
            if let Some(pos_count) = override_positions_count {
                positions_count = usize::from(pos_count)
            } else {
                positions_count = self.vertices.length();
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
                    .indices
                    .windows(3)
                    .map(|i| i.try_into().unwrap())
                    .collect();
            } else {
                // Lenght is self.indices.len() / 3
                self.faces = self
                    .indices
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
            let position_count = if self.indices.indices.len() > 0 {
                self.indices.indices.len()
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
            self.last_collider_world_vertices =
                vec![Vec3wgslF32::new_zero(); self.vertices.length()]; //Vec::with_capacity((self.vertices.length()));
            if self.static_faces {
                return;
            }
            let faces_count = self.faces_count();
            self.planes = Faces::new(faces_count);
            self.collider_planes = Vec::with_capacity(faces_count);
            self.collider_planes_parallel = Vec::with_capacity(faces_count * 4usize);
        }
    }
    pub fn update_collider_planes(&mut self) {
        let positions = self.vertices.get_positions();
        for (position, col_pos) in positions.zip(&mut self.last_collider_world_vertices) {
            col_pos.0 = position.0.transform(self.collisions_transform_matrix);
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
    pub fn set_vertices(&mut self, vertices: VertexKind) {
        self.vertices = vertices;
        self.bounding_box.need_init = true;
        if self.character_can_collide_to {
            self.allocate_collider_planes();
        }
    }
    /**
     * Set indices to geometry
     */
    pub fn set_indices(&mut self, indices: Vec<usize>) {
        self.indices = Indices {
            indices,
            gpu_buffer: None,
        };
        self.bounding_box.need_init = true;
        if self.character_can_collide_to {
            self.allocate_collider_planes();
        }
    }
}
pub struct Faces {
    pub planes: Vec<Plane>,
}

impl Faces {
    pub fn new(amount: usize) -> Faces {
        Faces {
            planes: Vec::with_capacity(amount),
        }
    }
}
