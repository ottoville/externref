use std::cell::RefCell;
use std::num::NonZeroUsize;
use std::rc::Rc;
use std::sync::Mutex;

use externref::Resource;
use terramath::MatrixMath;
use webgpu::device::JSDevice;

use webgpu::buffer::buffer::GPUBuffer;

pub const PROJECTION_BUFFER_SIZE: usize = 224; // 64+64+64+8+4+4+4+4 + ALIGN
pub const TILE_COUNT: [f32; 3] = [32.0, 18.0, 48.0];
struct Planes {
    near_plane: f32,
    far_plane: f32,
}
#[repr(C, align(4))]
pub struct InnerProjection {
    pub projection_reversed_z: Mutex<[[f32; 4]; 4]>,
    planes: Planes,
    fow: f32,
}
pub struct Projection {
    pub inner_projection: InnerProjection,
    pub buffer: Rc<RefCell<GPUBuffer<false, false, false, false, false, false, true>>>,
}
impl InnerProjection {
    pub fn create_buffer(
        &self,
        device: &Resource<JSDevice>,
        aspect_ratio: f32,
    ) -> GPUBuffer<false, false, false, false, false, false, true> {
        let f = 1.0 / (self.fow / 2.0).tan();
        let nf = 1.0 / (self.planes.near_plane - self.planes.far_plane);
        let mut projectionlock = self.projection_reversed_z.lock().unwrap();
        *projectionlock = [
            [f / aspect_ratio, 0.0, 0.0, 0.0],
            [0.0, f, 0.0, 0.0],
            [0.0, 0.0, 0.0, -1.0],
            [0.0, 0.0, self.planes.near_plane, 0.0],
        ];
        let reversed_projection_far_plane = [
            [f / aspect_ratio, 0.0, 0.0, 0.0],
            [0.0, f, 0.0, 0.0],
            [0.0, 0.0, self.planes.far_plane * nf, -1.0],
            [
                0.0,
                0.0,
                self.planes.far_plane * self.planes.near_plane * nf,
                0.0,
            ],
        ];
        let buffer = GPUBuffer::<false, false, false, false, false, false, true>::new_mapped(
            device,
            unsafe { NonZeroUsize::new_unchecked(PROJECTION_BUFFER_SIZE) },
            String::from("uniform_projection"),
        );
        let mut inverted = [[0.0; 4]; 4];
        let mut inverted_far_plane = [[0.0; 4]; 4];
        projectionlock.invert_to_ref(&mut inverted);
        reversed_projection_far_plane.invert_to_ref(&mut inverted_far_plane);
        let far_near_log = (self.planes.far_plane / self.planes.near_plane).log2();
        let near_and_far = [
            self.planes.near_plane * self.planes.far_plane,
            self.planes.far_plane - self.planes.near_plane,
            TILE_COUNT[2] / far_near_log,
            -((TILE_COUNT[2] * self.planes.near_plane.log2()) / far_near_log),
        ];

        buffer.set_mapped_range(&inverted, 0);
        buffer.set_mapped_range(&*projectionlock, 64);
        buffer.set_mapped_range(&inverted_far_plane, 128);
        buffer.set_mapped_range(&self.planes, 192);
        buffer.set_mapped_range(&near_and_far, 200);
        return buffer.unmap();
    }
}
impl Projection {
    pub fn new(device: &Resource<JSDevice>) -> Self {
        let inner_projection = InnerProjection {
            projection_reversed_z: Mutex::new([[0.0; 4]; 4]),
            planes: Planes {
                near_plane: 1.0,
                far_plane: 100000.0,
            },
            fow: 0.4,
        };
        let buffer = Rc::new(RefCell::new(inner_projection.create_buffer(device, 1.0)));
        Projection {
            inner_projection,
            buffer,
        }
    }
}

#[cfg(test)]
#[test]
fn test_projection() {
    use externref::ExternRef;
    unsafe {
        let projection = Projection::new(&Resource::new_non_null(std::mem::transmute::<
            usize,
            ExternRef,
        >(0)));

        assert_eq!(
            *projection
                .inner_projection
                .projection_reversed_z
                .lock()
                .unwrap(),
            [
                [4.933155, 0.0, 0.0, 0.0],
                [0.0, 4.933155, 0.0, 0.0],
                [0.0, 0.0, 0.0, -1.0],
                [0.0, 0.0, 1.0, 0.0]
            ]
        );
        projection.inner_projection.create_buffer(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            2.0,
        );
        assert_eq!(
            *projection
                .inner_projection
                .projection_reversed_z
                .lock()
                .unwrap(),
            [
                [2.4665775, 0.0, 0.0, 0.0],
                [0.0, 4.933155, 0.0, 0.0],
                [0.0, 0.0, 0.0, -1.0],
                [0.0, 0.0, 1.0, 0.0]
            ]
        );
    }
}
