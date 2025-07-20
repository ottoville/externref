use std::sync::{Arc, Mutex};

use externref::Resource;

use super::command_encoder::GPUCommandEncoder;
use super::gpu::JSDevice;
use crate::{allocators::freeindex::FreeIndexIndex, gpu::buffer::buffer::GPUBuffer};
use crate::swapbuffers::SwapBuffers;

pub struct Lights {
    pub lights: Vec<FreeIndexIndex>,
    pub buffer: Arc<Mutex<GPUBuffer<false, false, false, true, false, false, false, true>>>,
    label: String,
    dirty: bool,
}

impl Lights {
    pub fn new(device: &Resource<JSDevice>, label: String) -> Lights {
        Lights {
            lights: vec![FreeIndexIndex(0)],
            buffer: Arc::new(Mutex::new(GPUBuffer::new(
                device,
                16,
                label.to_string(),
                false,
            ))),
            label,
            dirty: false,
        }
    }
    pub fn push(&mut self, value: FreeIndexIndex) {
        self.lights.push(value);
        self.dirty = true;
    }
    pub fn remove(&mut self, value: FreeIndexIndex) {
        let index = self.lights[1..]
            .iter()
            .position(|x| x.0 == value.0)
            .unwrap();
        //First value in buffer is used to encode its lenght
        self.lights.swap_remove(index + 1);
        self.dirty = true;
    }
    pub fn update_buffer(
        &mut self,
        device: &Resource<JSDevice>,
        command_encoder: &mut GPUCommandEncoder,
        swap_buffer: &mut SwapBuffers,
    ) {
        if !self.dirty {
            return;
        }
        self.dirty = false;
        self.lights[0] = FreeIndexIndex(self.lights.len() - 1);
        let mut buffer = self.buffer.lock().unwrap();
        if self.lights.capacity() * 4 > buffer.size {
            buffer.resize_zeroed(device, self.lights.capacity() * 4);
        }
        swap_buffer.get(device, buffer.size, |mapped_buffer| {
            mapped_buffer.set_mapped_range_raw(
                self.lights.as_ptr() as usize,
                self.lights.len() * 4,
                0,
            );
            command_encoder.copy_buffer_to_buffer(&**mapped_buffer, &*buffer, 0, 0, buffer.size);
        });
    }
}

#[cfg(test)]
#[test]
fn test_lights() {
    use externref::ExternRef;

    use crate::gpu::{
        bindgroup::BindGroup, bufferbinding::BufferBinding, gpu::init_gpu, queue::Queue,
    };
    unsafe {
        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            false,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0));
        let layout = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
        let mut lights = Lights::new(&device, String::from("GPUPointLights"));
        let bindgroup = BindGroup::new(
            String::from("test"),
            Arc::new(layout),
            vec![BufferBinding::new(lights.buffer.clone(), 0, None)],
        );
        bindgroup.get_bindgroup(&device);

        assert_eq!(bindgroup.resources.lock().unwrap().is_none(), false);
        let mut swapbuffers = SwapBuffers::new();

        swapbuffers.queue_submited();
        lights.push(FreeIndexIndex(1));
        let mut command_encoder = GPUCommandEncoder::new(&Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)), String::from("test"));
        assert_eq!(lights.dirty, true);
        lights.update_buffer(&device, &mut command_encoder, &mut swapbuffers);
        assert_eq!(lights.dirty, false);
        lights.update_buffer(&device, &mut command_encoder, &mut swapbuffers);
        assert_eq!(lights.dirty, false);
        assert_eq!(lights.buffer.lock().as_ref().unwrap().size, 16);
        lights.push(FreeIndexIndex(2));
        lights.push(FreeIndexIndex(3));
        lights.push(FreeIndexIndex(4));
        lights.update_buffer(&device, &mut command_encoder, &mut swapbuffers);
        assert_eq!(lights.buffer.lock().as_ref().unwrap().size, 32);
        assert_eq!(bindgroup.resources.lock().unwrap().is_none(), true);
        let queue = Queue {
            externref: Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
        };
        queue.submit(&mut vec![command_encoder.finish(String::from("test"))].drain(..));
        swapbuffers.queue_submited();
    }
}
