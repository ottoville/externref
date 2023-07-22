use std::collections::HashSet;
pub use crate::mesh::Mesh;
use crate::mesh::get_mesh_by_id_mut;

pub struct Elevator {
    vertices_horizontal:Vec<f32>,
    mouse_position:[f32;3],
    old_mouse_position:[f32;3],
    selected_vertices:Vec<(usize,f32)>,
    selected_faces:HashSet<usize>,
    selected_indices:HashSet<usize>,
    faces_of_vertices:Vec<Vec<usize>>,
    pub offset:usize,
    pub length:usize

}

#[no_mangle]
pub unsafe extern "C" fn create_elevator(mesh_id: usize) -> *mut Elevator {
    Box::leak(Box::new(Elevator::new(get_mesh_by_id_mut(mesh_id))))
}

#[no_mangle]
pub unsafe extern "C" fn mouse_position_pointer(elevator_ptr:*const Elevator) -> *const f32 {
    (*elevator_ptr).mouse_position.as_ptr()
}

#[no_mangle]
#[cfg(target_arch = "wasm32")]
pub unsafe extern "C" fn elevate(elevator_ptr:*mut Elevator, mesh_id: usize,radius:f32,height:f32) {
    (*elevator_ptr)._elevate(get_mesh_by_id_mut(mesh_id),radius,height)
}
#[no_mangle]
pub unsafe extern "C" fn get_length(elevator_ptr:*const Elevator) -> usize {
    (*elevator_ptr).length
}
#[no_mangle]
pub unsafe extern "C" fn get_offset(elevator_ptr:*const Elevator) -> usize {
    (*elevator_ptr).offset
}
impl Elevator {
    #[cfg(target_arch = "wasm32")]
    unsafe fn normalize(v:std::arch::wasm32::v128) -> std::arch::wasm32::v128 {
        use std::arch::wasm32::*;
        let squared=f32x4_mul(v,v);
        let squared_x = f32x4_extract_lane::<0>(squared);
        let squared_y = f32x4_extract_lane::<1>(squared);
        let squared_z = f32x4_extract_lane::<2>(squared);
        let scale = f32x4_splat(1.0/f32::sqrt(squared_x+squared_y+squared_z));
        f32x4_mul(v, scale)
    }
    #[cfg(target_arch = "wasm32")]
    unsafe fn _elevate(&mut self, mesh:&mut Mesh, radius:f32, full_height:f32) {
        use std::arch::wasm32::*;

        let height_max = 500.0;
        let height_min = -500.0;
        let mut new_position=false;

        if self.old_mouse_position[0] != self.mouse_position[0] || self.old_mouse_position[2] != self.mouse_position[2] {
            new_position=true;
            self.selected_indices.clear();
            self.selected_faces.clear();

            self.old_mouse_position[0]=self.mouse_position[0];
            self.old_mouse_position[1]=self.mouse_position[1];
            self.old_mouse_position[2]=self.mouse_position[2];


            let radius_sqrt=f32::powi(radius, 2);
            let v_radius_sqrt=f32x4_splat(radius_sqrt);

            let mouse_x=f32x4_splat(self.mouse_position[0]);
            let mouse_z=f32x4_splat(self.mouse_position[2]);
            self.selected_vertices.clear();
            self.offset=0;
            self.length=0;

            let selected_vertices = &mut self.selected_vertices;

            let enumers=self.vertices_horizontal.chunks(4).zip(self.vertices_horizontal.chunks(4).skip(2)).step_by(3).enumerate();
            enumers.for_each(|(i,(x, z))| {
                let v_x = v128_load(x.as_ptr() as *const v128);
                let s_x=f32x4_sub(v_x,mouse_x);

                let v_z = v128_load(z.as_ptr() as *const v128);
                let s_z=f32x4_sub(v_z,mouse_z);
                let v_distance_sqrt = f32x4_add( f32x4_mul(s_x,s_x), f32x4_mul(s_z,s_z) );
                if v128_any_true(f32x4_lt(v_distance_sqrt, v_radius_sqrt)) {
                    let v_distance = f32x4_sqrt(v_distance_sqrt);
                    let mut distance = f32x4_extract_lane::<0>(v_distance);
                    if distance < radius {
                        selected_vertices.push((i*4, distance))
                    }
                    distance = f32x4_extract_lane::<1>(v_distance);
                    if distance < radius {
                        selected_vertices.push((i*4 + 1, distance))
                    }
                    distance = f32x4_extract_lane::<2>(v_distance);
                    if distance < radius {
                        selected_vertices.push((i*4 + 2, distance))
                    }
                    distance = f32x4_extract_lane::<3>(v_distance);
                    if distance < radius {
                        selected_vertices.push((i*4 + 3, distance))
                    }
                }
            });
        }
        let radius_near = radius * 0.3;
        let radius_far = radius * 0.7;
        let geometry=mesh.get_geometry_mut();
        if geometry.indices.len() == 0 {
            panic!("Elevator needs indices")
        }
        let vertices = geometry.vertices.as_mut().unwrap();
        for sv in self.selected_vertices.iter() {
            let vertice=sv.0 * vertices.vertices_stride;
            let mut positiony = vertices.vertices[vertice +1];
            if sv.1 < radius_near {
                positiony += full_height;
            } else {
                positiony += full_height * (1.0 - (sv.1 - radius_near) / radius_far);
            }
            
            vertices.vertices[vertice +1] = f32::clamp(positiony,height_min,height_max);
            if new_position {
                let face_of_vertices=&self.faces_of_vertices[vertice / 12];
                for index in face_of_vertices {
                    self.selected_faces.insert(*index);
                }
            }

        }

        let half = geometry.faces.planes.len()/2;
        let stride=vertices.vertices_stride;
        for face_index in self.selected_faces.iter() {
            if new_position {
                self.selected_indices.insert(geometry.indices[face_index * 3]);
                self.selected_indices.insert(geometry.indices[face_index * 3 + 1]);
                self.selected_indices.insert(geometry.indices[face_index * 3 + 2]);
            }
            let v1_ptr = std::slice::from_ref(&vertices.vertices[geometry.indices[face_index * 3]*stride]).as_ptr() as *mut v128;
            let v1 = v128_load(v1_ptr);

            let v2_ptr = std::slice::from_ref(&vertices.vertices[geometry.indices[face_index * 3 +1]*stride]).as_ptr()  as *mut v128;
            let v2 = v128_load(v2_ptr);

            let v3_ptr = std::slice::from_ref(&vertices.vertices[geometry.indices[face_index * 3 + 2]*stride]).as_ptr()  as *mut v128;
            let v3 = v128_load(v3_ptr);

            let v1v2=f32x4_sub(v1,v2);
            let v3v2=f32x4_sub(v3,v2);

            let mut plane = if (face_index & 1) == 0 {
                &mut geometry.faces.planes[half + (face_index >> 1)]
            } else {
                &mut geometry.faces.planes[face_index >> 1]
            };

            let v3v2_shuffled_yzxw=i32x4_shuffle::<1,2,0,3>(v3v2,v3v2);
            let v1v2_shuffled_yzxw=i32x4_shuffle::<1,2,0,3>(v1v2,v1v2);

            let cross_shuffled = f32x4_sub(
                f32x4_mul(v1v2, v3v2_shuffled_yzxw),
                f32x4_mul(v1v2_shuffled_yzxw, v3v2)
                
            );


            let normalized = Elevator::normalize(i32x4_shuffle::<1,2,0,3>(cross_shuffled,cross_shuffled));
            let dot=f32x4_mul(normalized, v2);

            v128_store(plane.norm.as_ptr() as *mut v128,normalized);
            plane.d=-(f32x4_extract_lane::<0>(dot) + f32x4_extract_lane::<1>(dot) + f32x4_extract_lane::<2>(dot));

        }
        for vertex_index in self.selected_indices.iter() {
            let faces=&self.faces_of_vertices[*vertex_index];
            let norm_ptr = std::slice::from_ref(&vertices.vertices[vertex_index*stride+4]).as_ptr() as *mut v128;

            let mut norm_v = f32x4_splat(0.0);
            for face_index in faces.iter() {
                let plane = if (face_index & 1) == 0 {
                    &mut geometry.faces.planes[half + (face_index >> 1)]
                } else {
                    &mut geometry.faces.planes[face_index >> 1]
                };
                let plane_vector=v128_load(plane.norm.as_ptr() as *mut v128);
                norm_v = f32x4_add(norm_v, plane_vector)
            }

            let fc = f32x4_splat(1.0 / faces.len() as f32);
            let normalized = Elevator::normalize(f32x4_mul(norm_v, fc));
            v128_store(norm_ptr,normalized);
        }
        if new_position && self.selected_vertices.len() > 0 {
            self.offset = self.selected_vertices.iter().min_by(|x, y| x.0.cmp(&y.0) ).unwrap().0 * stride;
            let max = self.selected_vertices.iter().max_by(|x, y| x.0.cmp(&y.0) ).unwrap().0 * stride + stride;
            self.length = max-self.offset;
        }
    }

    pub fn new (mesh:&mut Mesh) -> Elevator {
        let geometry = mesh.get_geometry_mut();
        let vertices = geometry.vertices.as_ref().unwrap();
        let mut vertices_horizontal = Vec::with_capacity(vertices.length()*3);
        let iter = vertices.vertices.chunks(vertices.vertices_stride * 4);
        for val in iter {
            let mut v: Vec<f32> = vec![
                val[0], val[vertices.vertices_stride],        val[vertices.vertices_stride * 2],        val[vertices.vertices_stride * 3],
                val[1], val[vertices.vertices_stride + 1],    val[vertices.vertices_stride * 2 + 1],    val[vertices.vertices_stride * 3 + 1],
                val[2], val[vertices.vertices_stride + 2],    val[vertices.vertices_stride * 2 + 2],    val[vertices.vertices_stride * 3 + 2],
            ];
            vertices_horizontal.append(&mut v);
        }
        let positions_count = if geometry.indices.len() > 0 {
            geometry.indices.len()
        } else {
            vertices.length()
        };
        let mut faces_of_vertices:Vec<Vec<usize>> = vec![Vec::with_capacity(6);positions_count];
        if geometry.indices.len() == 0usize {
            panic!("Elevator needs indices")
        }
        for (i, indice) in geometry.indices.iter().enumerate() {
            faces_of_vertices[*indice].push(i/3);
        };
        Elevator {
            vertices_horizontal,
            mouse_position:[0.0,0.0,0.0],
            old_mouse_position:[0.0,0.0,0.0],
            selected_vertices:Vec::new(),
            selected_faces: HashSet::new(),
            selected_indices: HashSet::new(),
            faces_of_vertices,
            offset:0,
            length:0
        }
    }
}