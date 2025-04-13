use std::sync::{Arc, Mutex};

use externref::Resource;
use terramath::MatrixMath;

use crate::gpu::{
    buffer::{buffer::GPUBuffer, usages::UNIFORM_USAGE},
    gpu::JSDevice,
};

const PROJECTION_BUFFER_SIZE: usize = 224; // 64+64+64+8+4+4+4+4 + ALIGN
const TILE_COUNT: [f32; 3] = [32.0, 18.0, 48.0];
#[repr(C, align(4))]
pub struct InnerProjection {
    pub projection_reversed_z: [[f32; 4]; 4],
    near_plane: f32,
    far_plane: f32,
    fow: f32,
}
pub struct Projection {
    pub inner_projection: InnerProjection,
    pub buffer: Arc<Mutex<GPUBuffer<UNIFORM_USAGE>>>,
}
impl InnerProjection {
    pub fn create_buffer(
        &mut self,
        device: &Resource<JSDevice>,
        aspect_ratio: f32,
    ) -> GPUBuffer<UNIFORM_USAGE> {
        let f = 1.0 / (self.fow / 2.0).tan();
        let nf = 1.0 / (self.near_plane - self.far_plane);

        self.projection_reversed_z = [
            [f / aspect_ratio, 0.0, 0.0, 0.0],
            [0.0, f, 0.0, 0.0],
            [0.0, 0.0, 0.0, -1.0],
            [0.0, 0.0, self.near_plane, 0.0],
        ];
        let reversed_projection_far_plane = [
            [f / aspect_ratio, 0.0, 0.0, 0.0],
            [0.0, f, 0.0, 0.0],
            [0.0, 0.0, self.far_plane * nf, -1.0],
            [0.0, 0.0, self.far_plane * self.near_plane * nf, 0.0],
        ];
        let buffer = GPUBuffer::<UNIFORM_USAGE>::new_mapped(
            device,
            PROJECTION_BUFFER_SIZE,
            String::from("uniform_projection"),
            false,
        );
        let mut inverted = Box::new([[0.0; 4]; 4]);
        let mut inverted_far_plane = Box::new([[0.0; 4]; 4]);
        self.projection_reversed_z.invert_to_ref(&mut inverted);
        reversed_projection_far_plane.invert_to_ref(&mut inverted_far_plane);
        let far_near_log = (self.far_plane / self.near_plane).log2();
        let near_and_far = Box::new([
            self.near_plane * self.far_plane,
            self.far_plane - self.near_plane,
            TILE_COUNT[2] / far_near_log,
            -((TILE_COUNT[2] * self.near_plane.log2()) / far_near_log),
        ]);

        buffer.set_mapped_range(inverted.as_ptr() as usize, 64, 0);
        buffer.set_mapped_range(self.projection_reversed_z.as_ptr() as usize, 64, 64);
        buffer.set_mapped_range(inverted_far_plane.as_ptr() as usize, 64, 128);
        //Near and far plane
        buffer.set_mapped_range(&raw const self.near_plane as usize, 8, 192);
        buffer.set_mapped_range(near_and_far.as_ptr() as usize, 16, 200);
        return buffer.unmap();
    }
}
impl Projection {
    pub fn new(device: &Resource<JSDevice>) -> Self {
        let mut inner_projection = InnerProjection {
            projection_reversed_z: [[0.0; 4]; 4],
            near_plane: 1.0,
            far_plane: 100000.0,
            fow: 0.4,
        };
        let buffer = Arc::new(Mutex::new(inner_projection.create_buffer(device, 1.0)));
        Projection {
            inner_projection,
            buffer,
        }
    }
}
