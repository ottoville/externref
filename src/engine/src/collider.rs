
use wasm_bindgen::prelude::*;
pub use crate::mesh::Mesh;

#[wasm_bindgen]
pub struct Collider {
    intersection_point:[f32;4],
    pub collision_not_found:u32,
    pub nearest_distance_squared:f32,
    scaled_position:[f32;4],
    scaled_velocity:[f32;4],
    collided_mesh:u32
}
#[wasm_bindgen]
impl Collider {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Collider {
            intersection_point:[0.0,0.0,0.0,0.0],
            collision_not_found:1u32,
            nearest_distance_squared:0.0,
            scaled_position:[0.0,0.0,0.0,0.0],
            scaled_velocity:[0.0,0.0,0.0,0.0],
            collided_mesh:0u32
        }
    }
    #[wasm_bindgen(getter)]
    pub fn intersection_point_pointer(&self) -> *const f32 {
        self.intersection_point.as_ptr()
    }
    #[wasm_bindgen(getter)]
    pub fn collision_not_found_pointer(&self) -> usize {
        self.intersection_point.as_ptr() as usize + 16usize
    }
    #[wasm_bindgen(getter)]
    pub fn nearest_distance_squared_pointer(&self) -> usize {
        self.intersection_point.as_ptr() as usize + 20usize
    }
    #[wasm_bindgen(getter)]
    pub fn scaled_position_pointer(&self) -> *const f32 {
        self.scaled_position.as_ptr()
    }
    #[wasm_bindgen(getter)]
    pub fn scaled_velocity_pointer(&self) -> *const f32 {
        self.scaled_velocity.as_ptr()
    }
    #[wasm_bindgen(getter)]
    pub fn collided_mesh_pointer(&self) -> usize {
        self.intersection_point.as_ptr() as usize + 56usize

    }
}