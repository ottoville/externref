use externref::Resource;
use terramath::MatrixMath;

use crate::{
    camera::Camera,
    cameras::Cameras,
    gpu::{
        buffer::{buffer::GPUBuffer, usages::UNIFORM_USAGE},
        command_encoder::GPUCommandEncoder,
        gpu::JSDevice,
    },
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
    pub cameras: Cameras,
    pub inner_projection: InnerProjection,
    pub buffer: GPUBuffer<UNIFORM_USAGE>,
}
impl InnerProjection {
    fn create_buffer(
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

        buffer.set_mapped_range(inverted.as_ptr() as usize, 64, 0, 64);
        buffer.set_mapped_range(self.projection_reversed_z.as_ptr() as usize, 64, 64, 64);
        buffer.set_mapped_range(inverted_far_plane.as_ptr() as usize, 64, 128, 64);
        //Near and far plane
        buffer.set_mapped_range(&raw const self.near_plane as usize, 8, 192, 8);
        buffer.set_mapped_range(near_and_far.as_ptr() as usize, 16, 200, 16);
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
        let buffer = inner_projection.create_buffer(device, 1.0);
        Projection {
            inner_projection,
            buffer,
            cameras: Cameras {
                cameras: Vec::with_capacity(4),
            },
        }
    }
    pub fn update(&mut self, device: &Resource<JSDevice>, aspect_ratio: f32) {
        self.buffer = self.inner_projection.create_buffer(device, aspect_ratio);
    }
    pub fn update_views(
        &mut self,
        device: &Resource<JSDevice>,
        command_encoder: &GPUCommandEncoder,
    ) -> bool {
        let mut some_camera_updated = false;
        let mut closure = |camera: &mut Camera| {
            if camera.do_update_view != 0 {
                camera.update_view();
                camera.view.multiply(
                    &self.inner_projection.projection_reversed_z,
                    &mut camera.projection_view,
                );
                camera.update_projection(&device, &command_encoder);
                some_camera_updated = true;
            } else {
                camera.updated = false;
            }
        };
        for camera in self.cameras.cameras.iter_mut() {
            closure(camera);
            for child_camera in camera.children.iter_mut() {
                closure(child_camera);
                for child_child_camera in child_camera.children.iter_mut() {
                    closure(child_child_camera);
                }
            }
        }
        return some_camera_updated;
    }
}
