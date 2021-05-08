use wasm_bindgen::prelude::*;

pub use crate::mesh::Mesh;

#[wasm_bindgen]
pub struct Elevator {
    #[wasm_bindgen(skip)]
    pub vertices_horizontal:Vec<f32>,
}
#[wasm_bindgen]
impl Elevator {
    //pub fn get_vertices(&self) -> Vec<f32> {
    //    &self.vertices_horizontal
   // }
    pub fn new (mesh:&Mesh) -> Vec<f32> {
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
        vertices
        //Elevator {
        //    vertices_horizontal:vertices,
        //}
    }
}