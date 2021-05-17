
use wasm_bindgen::prelude::*;
pub use crate::mesh::Mesh;

#[wasm_bindgen]
pub struct Elevator {
    #[wasm_bindgen(skip)]
    pub vertices_horizontal:Vec<f32>,
}
#[wasm_bindgen]
impl Elevator {
    #[cfg(target_arch = "wasm32")]
    #[target_feature(enable = "simd128")]    
    unsafe fn elevate(&self) {
        use std::arch::wasm32::*;
        let iter2 = self.vertices_horizontal.chunks(4).skip(1).step_by(3);
        for val in iter2 {
            let a = v128_load(val.as_ptr() as *const v128);
        }
    }
    pub fn new (mesh:&Mesh) -> Elevator {
        let mut vertices = Vec::new();
        let iter = mesh.geometry.vertices.chunks(mesh.geometry.vertices_stride * 4);
        for val in iter {
            let mut v: Vec<f32> = vec![
                val[0], val[mesh.geometry.vertices_stride],        val[mesh.geometry.vertices_stride * 2],        val[mesh.geometry.vertices_stride * 3],
                val[1], val[mesh.geometry.vertices_stride + 1],    val[mesh.geometry.vertices_stride * 2 + 1],    val[mesh.geometry.vertices_stride * 3 + 1],
                val[2], val[mesh.geometry.vertices_stride + 2],    val[mesh.geometry.vertices_stride * 2 + 2],    val[mesh.geometry.vertices_stride * 3 + 2],
            ];
            vertices.append(&mut v);
        }
        Elevator {
            vertices_horizontal:vertices,
        }
    }
}