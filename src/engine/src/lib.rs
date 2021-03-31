extern crate wasm_bindgen;

mod engine;
mod geometry;
mod mesh;
mod boundingbox;
pub use crate::engine::Engine;
pub use crate::geometry::Geometry;

pub struct Vec4<T> {
    x: T,
    y: T,
    z: T,
    w: T,
}
#[derive(Copy, Clone)]
pub struct Vec3<T> {
    x: T,
    y: T,
    z: T,
}

impl Vec3<f32> {
    fn transform_to_ref(&self, m: &mut Vec4<Vec4<f32>>, other: &mut Vec3<f32>) {
        let rx = self.x * m.x.x + self.y * m.y.x + self.z * m.z.x + m.w.x;
        let ry = self.x * m.x.y + self.y * m.y.y + self.z * m.z.y + m.w.y;
        let rz = self.x * m.x.z + self.y * m.y.z + self.z * m.z.z + m.w.z;
        let rw = 1.0 / (self.x * m.x.w + self.y * m.y.w + self.z * m.y.w + m.w.w);
        other.x = rx * rw;
        other.y = ry * rw;
        other.z = rz * rw;

    }
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