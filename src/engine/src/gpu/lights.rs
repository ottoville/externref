use std::cell::RefCell;
use std::num::NonZeroUsize;
use std::rc::Rc;
use std::sync::{Arc, Mutex};

use externref::Resource;
use webgpu::buffer::buffer::GPUBuffer;
use webgpu::command_encoder::GPUCommandEncoder;
use webgpu::device::JSDevice;

use crate::allocators::freeindex::FreeIndexIndex;
use crate::swapbuffers::SwapBuffers;

pub struct InnerLights {
    pub lights: Vec<FreeIndexIndex>,
    pub dirty: bool,
}
impl InnerLights {
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
}
pub struct Lights {
    pub buffer: Rc<RefCell<GPUBuffer<false, false, false, true, false, false, false, true>>>,
    label: String,
    pub lights: Arc<Mutex<InnerLights>>,
}

impl Lights {
    pub fn new(
        device: &Resource<JSDevice>,
        label: String,
        inner_lights: Arc<Mutex<InnerLights>>,
    ) -> Lights {
        Lights {
            lights: inner_lights,
            buffer: Rc::new(RefCell::new(GPUBuffer::new(
                device,
                unsafe { NonZeroUsize::new_unchecked(16) },
                label.to_string(),
            ))),
            label,
        }
    }

    pub fn update_buffer(
        &mut self,
        device: &Resource<JSDevice>,
        command_encoder: &mut GPUCommandEncoder,
        swap_buffer: &mut SwapBuffers,
    ) {
        let mut inner_lights = self.lights.lock().unwrap();
        if !inner_lights.dirty {
            return;
        }
        inner_lights.dirty = false;
        inner_lights.lights[0] = FreeIndexIndex(inner_lights.lights.len() - 1);
        let mut buffer = self.buffer.borrow_mut();
        if inner_lights.lights.capacity() * 4 > buffer.size.get() {
            buffer.resize_zeroed(
                device,
                NonZeroUsize::new(inner_lights.lights.capacity() * 4).unwrap(),
            );
        }
        swap_buffer.get(device, buffer.size, |mapped_buffer| {
            mapped_buffer.set_mapped_range_raw(
                inner_lights.lights.as_ptr() as usize,
                inner_lights.lights.len() * 4,
                0,
            );
            command_encoder.copy_buffer_to_buffer(&**mapped_buffer, &*buffer, 0, 0, buffer.size);
        });
    }
}

#[cfg(test)]
#[test]
fn test_lights() {
    use webgpu::bindgroup_layout::BindGroupLayout;
    use webgpu::buffer_binding_layout::{BufferBindingType, GPUBufferBindingLayout};

    use crate::gpu::gpu::init_gpu;
    use crate::gpu::shader::SHADER_STAGE_COMPUTE_AND_FRAGMENT;
    use externref::ExternRef;
    use webgpu::{bindgroup::bindgroup::BindGroup, bufferbinding::BufferBinding, queue::Queue};
    unsafe {
        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0));
        let mut lights = Lights::new(
            &device,
            String::from("GPUPointLights"),
            Arc::new(Mutex::new(InnerLights {
                lights: vec![FreeIndexIndex(0)],
                dirty: false,
            })),
        );

        let layout = BindGroupLayout::new(
            &device,
            String::from("test"),
            [
                &GPUBufferBindingLayout::<SHADER_STAGE_COMPUTE_AND_FRAGMENT>::new(
                    0,
                    BufferBindingType::Uniform,
                    false,
                    16,
                ),
            ],
        );

        let bindgroup = BindGroup::new(
            String::from("test"),
            &layout,
            [BufferBinding::new(lights.buffer.clone(), 0, None)],
        );
        bindgroup.get_bindgroup(&device);

        assert_eq!(bindgroup.resources.borrow().is_none(), false);
        let mut swapbuffers = SwapBuffers::new();

        swapbuffers.queue_submited();
        {
            let mut inner_lights = lights.lights.lock().unwrap();
            inner_lights.push(FreeIndexIndex(1));
        }
        let mut command_encoder = GPUCommandEncoder::new(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            String::from("test"),
        );
        {
            let inner_lights = lights.lights.lock().unwrap();
            assert_eq!(inner_lights.dirty, true);
        }
        lights.update_buffer(&device, &mut command_encoder, &mut swapbuffers);
        {
            let inner_lights = lights.lights.lock().unwrap();
            assert_eq!(inner_lights.dirty, false);
        }
        lights.update_buffer(&device, &mut command_encoder, &mut swapbuffers);
        {
            let inner_lights = lights.lights.lock().unwrap();
            assert_eq!(inner_lights.dirty, false);
        }
        assert_eq!(lights.buffer.borrow().size.get(), 16);
        {
            let mut inner_lights = lights.lights.lock().unwrap();
            inner_lights.push(FreeIndexIndex(2));
            inner_lights.push(FreeIndexIndex(3));
            inner_lights.push(FreeIndexIndex(4));
        }

        lights.update_buffer(&device, &mut command_encoder, &mut swapbuffers);
        assert_eq!(lights.buffer.borrow().size.get(), 32);
        assert_eq!(bindgroup.resources.borrow().is_none(), true);
        let queue = Queue {
            externref: Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            pending_command_buffers: Vec::new(),
        };
        queue.submit([command_encoder.finish(String::from("test"))]);
        swapbuffers.queue_submited();
    }
}
