extern crate wasm_bindgen;

mod engine;
mod boundingbox;
mod mesh;
pub use crate::engine::Engine;
pub use crate::boundingbox::BoundingBox;

const GPU_ALIGNMENT: u32 = 256;

pub struct Vec4<T> {
    x: T,
    y: T,
    z: T,
    w: T,
}
pub struct Vec3<T> {
    x: T,
    y: T,
    z: T,
}

#[repr(align(8))]
pub struct GPUMesh {
    transformation: Vec4<Vec4<f32>>,
    delta: [f32; 4],
    custom: [f32; 4],
    acceleration: [f32; 4],
}
impl GPUMesh {
    pub fn new() -> Self {
        let m = GPUMesh {
            transformation: Vec4 {
                x: Vec4 { x:1.0, y:0.0, z:0.0, w:0.0},
                y: Vec4 { x:0.0, y:1.0, z:0.0, w:0.0},
                z: Vec4 { x:0.0, y:0.0, z:1.0, w:0.0},
                w: Vec4 { x:0.0, y:0.0, z:0.0, w:1.0},
            },
            delta: [0.0, 0.0, 0.0, 0.0],
            custom: [0.0, 0.0, 0.0, 0.0],
            acceleration: [0.0, 0.0, 0.0, 0.0],
        };

        return m;
    }
}