use std::{cell::Cell, num::NonZeroUsize, rc::Rc, sync::atomic::AtomicU32};

use collider::ColliderPlane;
use logger::LoggerArray;
use rapier3d::{
    geometry::{Collider, ColliderBuilder},
    math::Point,
    na::{Const, OPoint},
    pipeline::ActiveEvents,
};
use terramath::{CrossProduct, Plane, Vec3wgslF32, VectorMath, VectorMathF32};

pub use crate::boundingbox::BoundingBox;
use crate::{
    allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex,
    gpu::{
        buffer::{
            buffer::GPUBuffer,
            mappadle_buffer::MappadleGPUBufferRead,
            mapped_buffer::MappedGPUBuffer,
            usages::{INDEX_USAGE, MAP_READ_COPYDST_USAGE},
        },
        gpu::serialize_terrain,
    },
    indices::Indices,
    math2::Vec2wgslF32,
    mesh::{Mesh, ENGINE},
    vertices::{Position2DAndUV, PositionAndNormalAndUV, VertexKind},
    MULTIVALUE_USIZE,
};

#[no_mangle]
pub unsafe extern "C" fn indices_field_pointer(geometry_ptr: *const Geometry) -> *const usize {
    let geometry = &(*geometry_ptr);
    let indices = &geometry.indices.as_ref().unwrap();
    MULTIVALUE_USIZE[0] = indices.indices.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = indices.indices.len();
    MULTIVALUE_USIZE[2] = indices.indices.capacity();
    MULTIVALUE_USIZE.as_ptr()
}
#[no_mangle]
pub unsafe extern "C" fn vertices_pointer(
    geometry: *mut Geometry,
    // If vertices are modified, the BB needs to be inited
    need_init: bool,
) -> usize {
    if need_init {
        (*geometry).bounding_box.need_init = true;
    }
    let vertices = &(*geometry).vertices;

    match vertices {
        Some(verts) => verts.as_ptr(),
        None => panic!("Asked vertices pointer but there are no vertices"),
    }
}
/**
 * stride as DWORD in vertices vec.
 */
#[no_mangle]
pub unsafe extern "C" fn vertices_stride(geometry: *const Geometry) -> usize {
    (*geometry).vertices.as_ref().unwrap().stride() / 4usize
}
#[no_mangle]
pub unsafe extern "C" fn set_faces(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
    ptr: *mut Plane,
    length: usize,
    cap: usize,
) {
    let planes = Vec::from_raw_parts(ptr, length / 4, cap / 4);
    let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];

    let geometry = mesh.get_geometry_mut();
    geometry.collider_planes.collider_planes = Vec::with_capacity(planes.len());
    geometry.collider_planes_parallel = vec![[[0.0; 4]; 4]; planes.len() / 4];
    geometry.planes.planes = planes;
}
#[no_mangle]
pub unsafe extern "C" fn vertices_count(geometry_ptr: *const Geometry) -> usize {
    let geometry = &(*geometry_ptr);
    geometry.vertices.as_ref().unwrap().length()
}
#[no_mangle]
pub unsafe extern "C" fn have_vertices(
    mesh_id: *const ExplicitGenerationalFreeListIndex<Mesh>,
) -> bool {
    let mesh = &ENGINE.meshes.lock().unwrap()[&*mesh_id];
    mesh.get_geometry().vertices.is_some()
}
#[no_mangle]
pub unsafe extern "C" fn set_indices_and_vertices_PositionAndNormalAndUV(
    mesh_id: *mut ExplicitGenerationalFreeListIndex<Mesh>,
    indices_buffer: *mut GPUBuffer<MAP_READ_COPYDST_USAGE>,
    vertices_buffer: *mut GPUBuffer<MAP_READ_COPYDST_USAGE>,
) {
    let gate = Rc::new(Cell::new(false));
    let gate2 = gate.clone();
    let then = |mesh: &mut Mesh| {
        let geometry = mesh.geometry.as_mut().unwrap();
        let vertices = geometry.vertices.as_ref().unwrap();
        let indices = &geometry.indices.as_ref().unwrap().indices;

        serialize_terrain(
            vertices.as_ptr(),
            vertices.length() * vertices.stride(),
            indices.as_ptr() as usize,
            indices.len(),
        );
        let collider = mesh.create_trimesh_collider();
        ENGINE
            .engine2
            .lock()
            .unwrap()
            .add_collider_to_mesh(collider, mesh);
    };
    Box::from_raw(indices_buffer).map_read_async(
        0,
        None,
        Box::into_raw(Box::new(
            move |buffer: MappedGPUBuffer<GPUBuffer<MAP_READ_COPYDST_USAGE>>| {
                let mut indices: Vec<usize> = vec![0; buffer.size / 4];
                buffer.get_mapped_range_raw(indices.as_mut_ptr() as usize, buffer.size, 0);
                let mesh: &mut Mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
                let geometry = mesh.geometry.as_mut().unwrap();
                geometry.set_indices(indices);
                // Execute callback if gate was "true", set it to "true" if it was "false"
                gate.set(gate.get().then(|| then(mesh)).is_none());
            },
        )),
    );
    Box::from_raw(vertices_buffer).map_read_async(
        0,
        None,
        Box::into_raw(Box::new(
            move |buffer: MappedGPUBuffer<GPUBuffer<MAP_READ_COPYDST_USAGE>>| {
                let mut vertices: Vec<PositionAndNormalAndUV> =
                    Vec::with_capacity(buffer.size / size_of::<PositionAndNormalAndUV>());
                buffer.get_mapped_range_raw(vertices.as_mut_ptr() as usize, buffer.size, 0);
                vertices.set_len(buffer.size / size_of::<PositionAndNormalAndUV>());
                let mesh = &mut ENGINE.meshes.lock().unwrap()[&*mesh_id];
                let geometry = mesh.geometry.as_mut().unwrap();
                geometry.set_vertices(VertexKind::PositionAndNormalAndUV(vertices));
                geometry.faces_dirty = true;
                // Execute callback if gate was "true", set it to "true" if it was "false"
                gate2.set(gate2.get().then(|| then(mesh)).is_none());
            },
        )),
    );
}
#[no_mangle]
pub unsafe extern "C" fn dedup_positions(geometry_ptr: *mut Geometry) {
    (*geometry_ptr).dedup_positions();
}
static ID: AtomicU32 = AtomicU32::new(0);
#[no_mangle]
pub unsafe extern "C" fn create_legacy_terrain_geometry(
    scenes: f32,
) -> *mut ExplicitGenerationalFreeListIndex<Mesh> {
    let mut label = String::from("Terrain");
    label.push_str(
        &ID.fetch_add(1, std::sync::atomic::Ordering::Release)
            .to_string(),
    );
    let mut meshes = ENGINE.meshes.lock().unwrap();
    let mesh_id: ExplicitGenerationalFreeListIndex<Mesh> = Mesh::new(
        0.0,
        0.0,
        scenes,
        0,
        label,
        None,
        None,
        &mut meshes,
        true,
    );
    let mut geometry = Box::new(Geometry::new(
        true,
        true,
        false,
        "legacy_terrain".to_string(),
    ));
    geometry.set_vertices(VertexKind::PositionAndNormalAndUV(vec![
        PositionAndNormalAndUV {
            position: Vec3wgslF32([0.0; 3]),
            normal: Vec3wgslF32([0.0; 3]),
            uv: Vec2wgslF32 { vec: [0.0; 2] },
        },
    ]));
    geometry.set_indices(vec![0, 0, 0]);
    let mesh = &mut meshes[&mesh_id];
    mesh.geometry = Some(geometry);
    Box::into_raw(Box::new(mesh_id))
}
#[no_mangle]
pub unsafe extern "C" fn create_ui_geometry(position_count: usize) -> *mut Geometry {
    let mut geometry = Box::new(Geometry::new(false, false, false, "UI".to_string()));

    let mut vertices: Vec<Position2DAndUV> = Vec::with_capacity(position_count);
    vertices.set_len(position_count);
    geometry.set_vertices(VertexKind::Position2DAndUV(vertices));
    Box::into_raw(geometry)
}
pub struct ColliderPlanes {
    last_collider_world_vertices: Vec<Vec3wgslF32>,
    pub collider_planes: Vec<ColliderPlane>,
}
pub struct Geometry {
    pub bounding_box: BoundingBox,
    pub vertices: Option<VertexKind>,
    pub indices: Option<Indices>,
    pub faces: Vec<[usize; 3]>,
    pub faces_dirty: bool,
    pub planes: Faces,
    pub strip: bool,
    pub label: String,
    pub collider_planes: ColliderPlanes,
    pub collider_planes_parallel: Vec<[[f32; 4]; 4]>, //lanes for x,y,z,d
    pub collisions_transform_matrix: [[f32; 4]; 4],
    pub last_collider_transform_matrix: [[f32; 4]; 4],
    pub static_faces: bool, // Used for terrain
    pub camera_can_collide_to: bool,
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
    pub fn create_convex_collider(
        &mut self,
        collision_events: bool,
        scaling: [f32; 3],
    ) -> *mut Collider {
        let positions = self.vertices.as_ref().unwrap().get_positions();

        let mut new_indices = self.indices.as_ref().unwrap().indices.clone();
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
                Box::into_raw(Box::new(builder.build()))
            }
            None => {
                panic!("Failure to create convex collider")
            }
        }
    }
    pub fn calculate_normals(&mut self) {
        self.create_faces(Option::None);
        let vertices = self.vertices.as_mut().unwrap();
        for normal in vertices.get_normals_mut() {
            normal.0.clear();
        }
        for triangle in self.faces.iter() {
            let ia = vertices.get_position(triangle[0]).0;
            let ib = vertices.get_position(triangle[1]).0;
            let ic = vertices.get_position(triangle[2]).0;

            //TODO: check if frontface is cw or ccw
            let e1 = ia.sub_vec(&ib);
            let e2 = ic.sub_vec(&ib);

            let no = e1.cross(&e2);

            vertices.get_normal_mut(triangle[0]).0.add_vec_in_place(&no);
            vertices.get_normal_mut(triangle[1]).0.add_vec_in_place(&no);
            vertices.get_normal_mut(triangle[2]).0.add_vec_in_place(&no);
        }
        for normal in vertices.get_normals_mut() {
            normal.0.normalize_in_place();
        }
    }

    /**
       Removes duplicated positions
    **/
    pub fn dedup_positions(&mut self) {
        match &mut self.vertices.as_mut().unwrap() {
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
                            dedup_index(ii, i, &mut self.indices.as_mut().unwrap().indices);
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
            VertexKind::Position2DAndUV(_) => todo!(),
        }
    }
    pub fn new(
        camera_can_collide_to: bool,
        static_faces: bool,
        strip: bool,
        label: String,
    ) -> Self {
        Geometry {
            bounding_box: BoundingBox::new(),
            vertices: None,
            indices: None,
            faces: Vec::new(),
            faces_dirty: true,
            planes: Faces::new(0),
            collider_planes: ColliderPlanes {
                last_collider_world_vertices: Vec::new(),
                collider_planes: Vec::new(),
            },
            collider_planes_parallel: Vec::new(),
            static_faces,
            strip,
            camera_can_collide_to,
            label,
            collisions_transform_matrix: [[0.0; 4]; 4],
            last_collider_transform_matrix: [[0.0; 4]; 4],
        }
    }
    pub fn create_faces(&mut self, override_positions_count: Option<NonZeroUsize>) {
        if !self.faces_dirty {
            return;
        }
        self.faces.clear();
        if self.indices.is_none() {
            if self.strip {
                panic!("Unindexed Trimesh collider with triangle strip is not yet supported");
            }
            let mut pos = 0usize;

            let positions_count: usize;
            if let Some(pos_count) = override_positions_count {
                positions_count = usize::from(pos_count)
            } else {
                positions_count = self.vertices.as_ref().unwrap().length();
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
                    .as_ref()
                    .unwrap()
                    .indices
                    .windows(3)
                    .map(|i| i.try_into().unwrap())
                    .collect();
            } else {
                // Lenght is self.indices.len() / 3
                self.faces = self
                    .indices
                    .as_ref()
                    .unwrap()
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
            let position_count = if let Some(indices) = self.indices.as_ref() {
                indices.indices.len()
            } else {
                self.vertices.as_ref().unwrap().length()
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
        if let Some(vertices) = self.vertices.as_ref() {
            self.collider_planes.last_collider_world_vertices =
                vec![Vec3wgslF32([0.0; 3]); vertices.length()]; //Vec::with_capacity((self.vertices.length()));
            if self.static_faces {
                return;
            }
            let faces_count = self.faces_count();
            self.planes = Faces::new(faces_count);
            self.collider_planes.collider_planes = Vec::with_capacity(faces_count);
            self.collider_planes_parallel = vec![[[0.0; 4]; 4]; faces_count / 4];
        }
    }
    pub fn check_collision(&mut self, collider: &mut collider::Collider) {
        if self.faces_count() % 4 != 0 {
            return;
        }
        if !self
            .last_collider_transform_matrix
            .eq(&self.collisions_transform_matrix)
        {
            self.last_collider_transform_matrix = self.collisions_transform_matrix.clone();
            self.update_collider_planes();
        }
        if self.collider_planes_parallel.len() == 0 {
            return;
        }
        #[cfg(target_arch = "wasm32")]
        collider.test_triangles(
            &self.collider_planes.collider_planes,
            &self.collider_planes_parallel,
            &self.collider_planes.last_collider_world_vertices,
        );
    }
    pub fn update_collider_planes(&mut self) {
        let positions = self.vertices.as_ref().unwrap().get_positions();
        for (position, col_pos) in
            positions.zip(&mut self.collider_planes.last_collider_world_vertices)
        {
            col_pos.0 = position.0.transform(&self.collisions_transform_matrix);
        }
        for collider_plane in self.collider_planes.collider_planes.iter_mut() {
            let v0 =
                &self.collider_planes.last_collider_world_vertices[collider_plane.vectors[0]].0;
            let v1 =
                &self.collider_planes.last_collider_world_vertices[collider_plane.vectors[1]].0;
            let v2 =
                &self.collider_planes.last_collider_world_vertices[collider_plane.vectors[2]].0;
            collider_plane.plane.update_from_triangle(v0, v1, v2);
        }
        if self.faces_count() % 4 == 0 {
            //Todo: merge with upper loop?
            for (quatro, parallel) in self
                .collider_planes
                .collider_planes
                .chunks_exact_mut(4)
                .zip(&mut self.collider_planes_parallel)
            {
                parallel[0][0] = quatro[0].plane.norm[0];
                parallel[0][1] = quatro[1].plane.norm[0];
                parallel[0][2] = quatro[2].plane.norm[0];
                parallel[0][3] = quatro[3].plane.norm[0];

                parallel[1][0] = quatro[0].plane.norm[1];
                parallel[1][1] = quatro[1].plane.norm[1];
                parallel[1][2] = quatro[2].plane.norm[1];
                parallel[1][3] = quatro[3].plane.norm[1];

                parallel[2][0] = quatro[0].plane.norm[2];
                parallel[2][1] = quatro[1].plane.norm[2];
                parallel[2][2] = quatro[2].plane.norm[2];
                parallel[2][3] = quatro[3].plane.norm[2];

                parallel[3][0] = quatro[0].plane.d;
                parallel[3][1] = quatro[1].plane.d;
                parallel[3][2] = quatro[2].plane.d;
                parallel[3][3] = quatro[3].plane.d;
            }
        } else {
            [
                "Mesh facescount is not dividable by 4, cant check collisions for geometry:",
                &self.label,
            ]
            .warn();
        }
    }
    pub fn rebuild_triangle_planes(&mut self) {
        if !self.camera_can_collide_to || self.vertices.is_none() || self.faces_count() == 0 {
            return;
        }
        //Todo: handle geometry with no indices and strip
        for triangle in self.indices.as_ref().unwrap().indices.chunks_exact(3) {
            let vectors: [usize; 3] = triangle.try_into().unwrap();
            self.collider_planes.collider_planes.push(ColliderPlane {
                plane: Plane {
                    norm: [0.0; 3],
                    d: 0.0,
                },
                vectors,
            });
        }
        //invalidate last_collider_transform_matrix to get update_collider_planes called again
        self.last_collider_transform_matrix = [[0.0; 4]; 4];
    }
    pub fn update_bounding_box(&mut self, transformation: &[[f32; 4]; 4]) {
        self.bounding_box
            .update_bounding_box(&self.vertices.as_ref().unwrap(), transformation)
    }
    pub fn set_vertices(&mut self, vertices: VertexKind) {
        self.vertices = Some(vertices);
        self.bounding_box.need_init = true;
        if self.camera_can_collide_to {
            self.allocate_collider_planes();
        }
    }
    /**
     * Set indices to geometry
     */
    pub fn set_indices(&mut self, indices: Vec<usize>) {
        let gpuopt = ENGINE.gpu.lock().unwrap();
        let gpu = gpuopt.as_ref().unwrap();
        let mut label = String::from("index_");
        label.push_str(&self.label);

        let mapped =
            GPUBuffer::<INDEX_USAGE>::new_mapped(&gpu.device, indices.len() * 4, label, false);
        mapped.set_mapped_range_raw(indices.as_ptr() as usize, indices.len() * 4, 0);

        match &mut self.indices {
            Some(inds) => {
                inds.indices = indices;
                inds.gpu_buffer.replace(mapped.unmap());
            }
            None => {
                self.indices = Some(Indices {
                    indices,
                    gpu_buffer: mapped.unmap(),
                });
            }
        }
        self.faces_dirty = true;
        self.bounding_box.need_init = true;
        if self.camera_can_collide_to {
            self.allocate_collider_planes();
            self.rebuild_triangle_planes();
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
