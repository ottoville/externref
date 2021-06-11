use std::collections::HashSet;
use wasm_bindgen::prelude::*;
pub use crate::mesh::Mesh;

#[wasm_bindgen]
pub struct Elevator {
    #[wasm_bindgen(skip)]
    pub vertices_horizontal:Vec<f32>,
    #[wasm_bindgen(skip)]
    pub mouse_position:[f32;3],
    #[wasm_bindgen(skip)]
    pub old_mouse_position:[f32;3],
    #[wasm_bindgen(skip)]
    pub selected_vertices:Vec<(usize,f32)>,
    #[wasm_bindgen(skip)]
    pub faces_of_vertices:Vec<Vec<usize>>,

}
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);
}
#[wasm_bindgen]
impl Elevator {
    unsafe fn _elevate(&mut self, mesh:&mut Mesh, radius:f32, full_height:f32) {
        use std::arch::wasm32::*;

        let height_max = 500.0;
        let height_min = -500.0;


        if self.old_mouse_position[0] != self.mouse_position[0] || self.old_mouse_position[2] != self.mouse_position[2] {
            self.old_mouse_position[0]=self.mouse_position[0];
            self.old_mouse_position[1]=self.mouse_position[1];
            self.old_mouse_position[2]=self.mouse_position[2];


            let radius_sqrt=f32::powi(radius, 2);
            let v_radius_sqrt=f32x4_splat(radius_sqrt);

            let mouse_x=f32x4_splat(self.mouse_position[0]);
            let mouse_z=f32x4_splat(self.mouse_position[2]);
            self.selected_vertices.clear();
          //  let Elevator { selected_vertices, .. } = self;

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

        let indices:&Vec<usize> = match &mesh.geometry.indices {
            None => {
                error("Elevator needs indices");
                panic!("Elevator needs indices")
            },
            Some(indices) => indices
        };

        let selected_iter = self.selected_vertices.iter();
        let mut selected_faces:HashSet<usize> = HashSet::new();
        for sv in selected_iter {
            let vertice=sv.0 * mesh.geometry.vertices_stride;
            let mut positiony = mesh.geometry.vertices[vertice +1];
            if sv.1 < radius_near {
                positiony += full_height;
            } else {
                positiony += full_height * (1.0 - (sv.1 - radius_near) / radius_far);
            }
            
            mesh.geometry.vertices[vertice +1] = f32::clamp(positiony,height_min,height_max);
            //log(&f32::clamp(positiony,height_min,height_max).to_string());
            let face_of_vertices=&self.faces_of_vertices[vertice / 12];
            for index in face_of_vertices {
                selected_faces.insert(*index);
            }

        }

        let half = mesh.geometry.faces.planes.len()/2;
        let stride=&mesh.geometry.vertices_stride;
        for face_index in selected_faces.iter() {
            
            //let v1_ptr: *const f32 = &mesh.geometry.vertices[indices[face_index * 3]*stride];
            let v1_ptr: *const f32 = std::slice::from_ref(&mesh.geometry.vertices[indices[face_index * 3]*stride]).as_ptr();
            let v1 = v128_load(v1_ptr as *const v128);
           // log(&mesh.geometry.vertices[indices[face_index * 3]*stride].to_string());
           let v2_ptr: *const f32 = std::slice::from_ref(&mesh.geometry.vertices[indices[face_index * 3 +1]*stride]).as_ptr();

           // let v2_ptr: *const f32 = &mesh.geometry.vertices[indices[face_index * 3 + 1]*8];
            let v2 = v128_load(v2_ptr as *const v128);

            let v3_ptr: *const f32 = std::slice::from_ref(&mesh.geometry.vertices[indices[face_index * 3 + 2]*stride]).as_ptr();

           // let v3_ptr: *const f32 = &mesh.geometry.vertices[indices[*face_index * 3 + 2]*8];
            let v3 = v128_load(v3_ptr as *const v128);



            
            //                v1v2[0] = v1[0]! - v2[0]!;
            let v1v2=f32x4_sub(v1,v2);
            //                v3v2[0] = v3[0]! - v2[0]!;
            let v3v2=f32x4_sub(v3,v2);

            let mut plane = if (face_index & 1) == 0 {
               /* mesh.geometry.faces.planes[half + (face_index >> 1)].norm[0]=-1.0;
                mesh.geometry.faces.planes[half + (face_index >> 1)].norm[1]=-1.0;
                mesh.geometry.faces.planes[half + (face_index >> 1)].norm[2]=-1.0;
                mesh.geometry.faces.planes[half + (face_index >> 1)].d=-1.0;*/
                &mut mesh.geometry.faces.planes[half + (face_index >> 1)] //.norm.as_ptr() as *mut v128
            } else {
               /* mesh.geometry.faces.planes[(face_index >> 1)].norm[0]=-1.0;
                mesh.geometry.faces.planes[(face_index >> 1)].norm[1]=-1.0;
                mesh.geometry.faces.planes[(face_index >> 1)].norm[2]=-1.0;
                mesh.geometry.faces.planes[(face_index >> 1)].d=-1.0;*/

                &mut mesh.geometry.faces.planes[face_index >> 1]//.norm.as_ptr() as *mut v128
            };
            //let v3v2_shuffled_yzxw=i32x4_shuffle::<1,2,0,3>(v3v2,v3v2);

            let v3v2_shuffled_yzxw=i32x4_shuffle::<1,2,0,3>(v3v2,v3v2);
            let v1v2_shuffled_yzxw=i32x4_shuffle::<1,2,0,3>(v1v2,v1v2);



            let cross_shuffled = f32x4_sub(
                f32x4_mul(v1v2, v3v2_shuffled_yzxw),
                f32x4_mul(v1v2_shuffled_yzxw, v3v2)
                
            );

            let cross = i32x4_shuffle::<1,2,0,3>(cross_shuffled,cross_shuffled);
            //log(&f32x4_extract_lane::<0>(cross).to_string());


            let squared=f32x4_mul(cross,cross);
            let squared_x = f32x4_extract_lane::<0>(squared);
            let squared_y = f32x4_extract_lane::<1>(squared);
            let squared_z = f32x4_extract_lane::<2>(squared);
            let scale = f32x4_splat(1.0/f32::sqrt(squared_x+squared_y+squared_z));
            let normalized=f32x4_mul(cross, scale);
            let dot=f32x4_mul(normalized, v2);


            //let normalized_ready=f32x4_replace_lane::<3>(normalized, -(f32x4_extract_lane::<0>(dot) + f32x4_extract_lane::<1>(dot) + f32x4_extract_lane::<2>(dot)));
            v128_store(plane.norm.as_ptr() as *mut v128,normalized);
            plane.d=-(f32x4_extract_lane::<0>(dot) + f32x4_extract_lane::<1>(dot) + f32x4_extract_lane::<2>(dot));
            //log(&plane.d.to_string());
            //v128_store(normalized_ptr,normalized_ready);
            //            const scale = 1 / Math.hypot(normalized[0], normalized[1], normalized[2]);

            
            /*let end = face_index * 3 + 3;
            let indices_slice = &indices[face_index * 3..end];
            for vertex_index in indices_slice.iter() {
                //var faces = this.#facesOfVertices[vertexIndex]!;
                let faces=&self.faces_of_vertices[*vertex_index];
                //const norm = this.#normalsView[vertexIndex]!;
               
                let norm_ptr:*const f32 = &mesh.geometry.vertices[mesh.geometry.vertices_stride*vertex_index+4];
                let norm_v = f32x4_splat(0.0);
                for face in faces.iter() {
                    if face % 2 == 0 {
                        //let facenormal = 
                    }

                }
            }*/
        }
    }
    #[wasm_bindgen] 
    pub fn elevate(&mut self,mesh:&mut Mesh,radius:f32,height:f32) {
        unsafe {
            self._elevate(mesh,radius,height)
        }
    }
    pub fn mouse_position_pointer(&self) -> *const f32 {
        self.mouse_position.as_ptr()
    }
    pub fn new (mesh:&Mesh) -> Elevator {
        let mut vertices = Vec::with_capacity(mesh.geometry.vertices.len()/mesh.geometry.vertices_stride*3);
        let iter = mesh.geometry.vertices.chunks(mesh.geometry.vertices_stride * 4);
        for val in iter {
            let mut v: Vec<f32> = vec![
                val[0], val[mesh.geometry.vertices_stride],        val[mesh.geometry.vertices_stride * 2],        val[mesh.geometry.vertices_stride * 3],
                val[1], val[mesh.geometry.vertices_stride + 1],    val[mesh.geometry.vertices_stride * 2 + 1],    val[mesh.geometry.vertices_stride * 3 + 1],
                val[2], val[mesh.geometry.vertices_stride + 2],    val[mesh.geometry.vertices_stride * 2 + 2],    val[mesh.geometry.vertices_stride * 3 + 2],
            ];
            vertices.append(&mut v);
        }
        let mut faces_of_vertices:Vec<Vec<usize>> = vec![Vec::with_capacity(6);mesh.positions_count];
        let indices:&Vec<usize> = match &mesh.geometry.indices {
            None => {
                error("Elevator needs indices");
                panic!("Elevator needs indices")
            },
            Some(indices) => indices
        };
        for (i, indice) in indices.iter().enumerate() {
            faces_of_vertices[*indice].push(i/3);
        };
        Elevator {
            vertices_horizontal:vertices,
            mouse_position:[0.0,0.0,0.0],
            old_mouse_position:[0.0,0.0,0.0],
            selected_vertices:Vec::new(),
            faces_of_vertices,
        }
    }
}