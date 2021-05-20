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
    pub faces_of_vertices:Vec<u32>

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


        let selected_iter = self.selected_vertices.iter();
        for sv in selected_iter {
            let mut positiony = mesh.geometry.vertices[sv.0 * mesh.geometry.vertices_stride +1];
            if sv.1 < radius_near {
                positiony += full_height;
            } else {
                positiony += full_height * (1.0 - (sv.1 - radius_near) / radius_far);
            }
            
            mesh.geometry.vertices[sv.0 * mesh.geometry.vertices_stride +1] = f32::clamp(positiony,height_min,height_max)
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

     /*   let index: number;
        for (index = 0; index < terrain.mesh.positionCount; index++) {
            this.#facesOfVertices[index] = [];
        }
        terrain.indices.forEach((index, i)=> {
            this.#facesOfVertices[index]!.push((i / 3) | 0);
        });  
*/


        Elevator {
            vertices_horizontal:vertices,
            mouse_position:[0.0,0.0,0.0],
            old_mouse_position:[0.0,0.0,0.0],
            selected_vertices:Vec::new(),
            faces_of_vertices:Vec::with_capacity(mesh.positions_count)
        }
    }
}