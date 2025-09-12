use std::sync::Mutex;
use std::sync::{Arc, Weak};

use externref::Resource;
use webgpu::bindgroup_layout::{BindGroupLayout, JSBindGroupLayout};
use webgpu::device::JSDevice;

use crate::MULTIVALUE_USIZE;

use super::buffer::buffer::JSBuffer;
use super::bufferbinding::BufferBinding;
use super::gpu::create_bind_group;
use super::renderbundle::RenderBundle;

#[no_mangle]
pub unsafe extern "C" fn iterate_bindings(
    iterator: *mut std::slice::Iter<'_, Arc<Mutex<BufferBinding>>>,
) -> *const usize {
    use std::ptr;

    use crate::MULTIVALUE_USIZE;

    let maybebinding = (*iterator).next();
    match maybebinding {
        Some(bindingmutex) => {
            let binding = bindingmutex.lock().unwrap();
            let buffer = binding.buffer.lock().unwrap();
            MULTIVALUE_USIZE[0] =
                ptr::read(buffer.externref() as *const Resource<JSBuffer> as *const usize);
            MULTIVALUE_USIZE[1] = binding.offset;
            MULTIVALUE_USIZE[2] = match binding.size {
                Some(size) => size.get(),
                None => buffer.size() - binding.offset,
            };
            return MULTIVALUE_USIZE.as_ptr();
        }
        None => {
            drop(Box::from_raw(iterator));
            return ptr::null();
        }
    }
}
pub struct JSBindGroup(());

pub struct BindGroup<const N: usize> {
    pub resources: Mutex<Option<Arc<BindGroupResources>>>,
    label: String,
    layout: Arc<Resource<JSBindGroupLayout>>,
    pub bufferbindings: [Arc<Mutex<BufferBinding>>; N],
    pub renderbundles: Mutex<Vec<Weak<Mutex<Option<RenderBundle>>>>>,
}
pub trait BindGroupTrait: Send + Sync {
    fn make_dirty(&self);
}
impl<const N: usize> BindGroupTrait for BindGroup<N> {
    fn make_dirty(&self) {
        self.resources.lock().unwrap().take();
        for somerenderbundle in self.renderbundles.lock().unwrap().iter() {
            if let Some(renderbundle) = somerenderbundle.upgrade() {
                renderbundle.lock().unwrap().take();
            }
        }
    }
}
pub struct BindGroupResources {
    pub externref: Resource<JSBindGroup>,
    pub rawbuffers: Vec<Arc<Resource<JSBuffer>>>,
}
impl<const N: usize> BindGroup<N> {
    pub fn new(
        label: String,
        layout: &BindGroupLayout<N>,
        bufferbindings: [Arc<Mutex<BufferBinding>>; N],
    ) -> Arc<BindGroup<N>> {
        let bind_group = Arc::new(BindGroup {
            resources: Mutex::new(None),
            label,
            layout: layout.externref.clone(),
            bufferbindings,
            renderbundles: Mutex::new(Vec::new()),
        });
        for buffer_binding_mutex in bind_group.bufferbindings.iter() {
            let mut buffer_binding = buffer_binding_mutex.lock().unwrap();
            let weak = Arc::downgrade(&bind_group);
            buffer_binding.bindgroups.push(weak);
            buffer_binding
                .buffer
                .lock()
                .unwrap()
                .add_binding(Arc::downgrade(buffer_binding_mutex));
        }
        return bind_group;
    }
    pub fn get_bindgroup(&self, device: &Resource<JSDevice>) -> Arc<BindGroupResources> {
        let mut resources = self.resources.lock().unwrap();
        let extenref_resources = resources.get_or_insert_with(|| {
            let mut rawbuffers = Vec::with_capacity(self.bufferbindings.len());
            for binding in self.bufferbindings.iter() {
                let buffer_binding: std::sync::MutexGuard<'_, BufferBinding> =
                    binding.lock().unwrap();
                let externref_arc = buffer_binding.buffer.lock().unwrap().externref_arc();
                rawbuffers.push(externref_arc);
            }

            let bindings_iterator = Box::new(self.bufferbindings.iter());
            let externref = unsafe {
                MULTIVALUE_USIZE[0] = self.label.as_ptr() as usize;
                MULTIVALUE_USIZE[1] = self.label.len();
                MULTIVALUE_USIZE[2] = self.label.capacity();
                create_bind_group(
                    device,
                    &self.layout,
                    MULTIVALUE_USIZE.as_ptr(),
                    Box::into_raw(bindings_iterator),
                )
            };
            Arc::new(BindGroupResources {
                externref,
                rawbuffers,
            })
        });
        return extenref_resources.clone();
    }
}

#[cfg(test)]
#[test]
fn test_bindgroup() {
    use super::gpu::{create_bind_group, init_gpu};
    use super::renderbundle::{RenderBundle, RenderBundleEncoder};
    use crate::engine;
    use crate::gpu::bindgroup_layout::{BufferBindingType, GPUBufferBindingLayout};
    use webgpu::bindgroup_layout::{BindGroupLayout, JSBindGroupLayout};

    use crate::gpu::command_encoder::GPUCommandEncoder;
    use crate::gpu::queue::Queue;
    use crate::gpu::shader::SHADER_STAGE_COMPUTE_AND_FRAGMENT;
    use crate::gpu::{binding_commands::BindingCommands, buffer::buffer::GPUBuffer};
    use crate::mesh::ENGINE;
    use externref::ExternRef;
    unsafe {
        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            false,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );

        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
        let mut renderbundle_encoder = RenderBundleEncoder::new(
            String::from("test"),
            &device,
            Vec::new(),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            1,
            false,
            false,
            None,
        );
        let buffer = GPUBuffer::<false, false, false, true, false, false, true>::new(
            &device,
            4,
            String::from("test"),
            false,
        );
        let rawbuffer = buffer.externref.clone();
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
            [BufferBinding::new(Arc::new(Mutex::new(buffer)), 0, None)],
        );
        {
            //Externref is not set yet, as it is set lazily
            assert_eq!(bindgroup.resources.lock().unwrap().is_none(), true);
            //buffer ref count is 2, one from test and other from bindgroup
            assert_eq!(Arc::strong_count(&rawbuffer), 2);
        }

        renderbundle_encoder.set_bindgroup(&device, 0, &bindgroup, &[]);
        let rawbindgroup = bindgroup
            .resources
            .lock()
            .as_ref()
            .unwrap()
            .as_ref()
            .unwrap()
            .clone();
        {
            //bindgroup 3 ref: test, bindgroup, renderbundle_encoder
            assert_eq!(Arc::strong_count(&rawbindgroup), 3);
            assert_eq!(Arc::strong_count(&rawbuffer), 3);
        }
        bindgroup.make_dirty();
        {
            //bindgroup 2 ref: test, renderbundle_encoder
            assert_eq!(Arc::strong_count(&rawbindgroup), 2);
            //buffer ref count is 3: test, command_encoder and rawbindgroup
            assert_eq!(Arc::strong_count(&rawbuffer), 3);
        }
        let mut gpuopt = ENGINE.gpu.lock();
        let gpuopt2 = gpuopt.as_mut().unwrap();
        let gpu = gpuopt2.as_mut().unwrap();

        assert_eq!(Arc::strong_count(&rawbuffer), 3);
        let command_encoder = GPUCommandEncoder::new(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            String::from("test"),
        );

        let mut renderpass_encoder = command_encoder.begin_render_pass(
            &String::from("test"),
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        renderbundle_encoder.record_renderbundle(
            &gpu.renderpasses[0].cameragroups(),
            &gpu.device,
            &gpu.cameras,
            1,
            &bindgroup,
            |renderbundle| {
                renderpass_encoder.execute_bundles(renderbundle);
            },
        );
        drop(renderbundle_encoder);

        {
            //bindgroup 2 ref: test, renderpass_encoder
            assert_eq!(Arc::strong_count(&rawbindgroup), 2);
            //buffer ref count is 3: test, command_encoder, rawbindgroup
            assert_eq!(Arc::strong_count(&rawbuffer), 3);
        }
        let command_encoder = renderpass_encoder.end();
        {
            let command_buffer = command_encoder.finish(String::from("test"));
            assert_eq!(Arc::strong_count(&rawbuffer), 3);

            let queue = Queue {
                externref: Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
                pending_command_buffers: Vec::new(),
            };
            //bindgroup 2 ref: test, command_buffer
            assert_eq!(Arc::strong_count(&rawbindgroup), 2);
            queue.submit([command_buffer]);
        }
        {
            //bindgroup 1 ref: test
            assert_eq!(Arc::strong_count(&rawbindgroup), 1);
            assert_eq!(Arc::strong_count(&rawbuffer), 3);
        }
    }
}
#[cfg(test)]
#[test]
fn test_bindgroup_buffer_resize() {
    use super::gpu::{create_bind_group, init_gpu};
    use super::renderbundle::{RenderBundle, RenderBundleEncoder};
    use crate::engine;
    use crate::gpu::bindgroup_layout::{BufferBindingType, GPUBufferBindingLayout};
    use crate::gpu::command_encoder::GPUCommandEncoder;
    use crate::gpu::queue::Queue;
    use crate::gpu::shader::SHADER_STAGE_COMPUTE_AND_FRAGMENT;
    use crate::gpu::{binding_commands::BindingCommands, buffer::buffer::GPUBuffer};
    use crate::mesh::ENGINE;
    use externref::ExternRef;
    use webgpu::bindgroup_layout::{BindGroupLayout, JSBindGroupLayout};
    unsafe {
        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
        let mut command_encoder = GPUCommandEncoder::new(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            String::from("test"),
        );

        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            false,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );

        let mut renderbundle_encoder = RenderBundleEncoder::new(
            String::from("test"),
            &device,
            Vec::new(),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            1,
            false,
            false,
            None,
        );
        let buffer = GPUBuffer::<false, false, true, true, false, false, true, true>::new(
            &device,
            4,
            String::from("test"),
            false,
        );
        let rawbuffer = buffer.externref.clone();
        let buffer_arc = Arc::new(Mutex::new(buffer));
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
            [BufferBinding::new(buffer_arc.clone(), 0, None)],
        );
        {
            //Externref is not set yet, as it is set lazily
            assert_eq!(bindgroup.resources.lock().unwrap().is_none(), true);
            //buffer ref count is 2, one from test and other from bindgroup
            assert_eq!(Arc::strong_count(&rawbuffer), 2);
        }

        renderbundle_encoder.set_bindgroup(&device, 0, &bindgroup, &[]);
        let rawbindgroup = bindgroup
            .resources
            .lock()
            .as_ref()
            .unwrap()
            .as_ref()
            .unwrap()
            .clone();
        buffer_arc
            .lock()
            .unwrap()
            .resize(&device, &mut command_encoder, 64);
        drop(buffer_arc);

        {
            //bindgroup 2 ref: test, renderbundle_encoder
            assert_eq!(Arc::strong_count(&rawbindgroup), 2);
            //buffer ref count is 3: test, command_encoder and rawbindgroup
            assert_eq!(Arc::strong_count(&rawbuffer), 3);
        }
        bindgroup.make_dirty();
        {
            //bindgroup 2 ref: test, renderbundle_encoder
            assert_eq!(Arc::strong_count(&rawbindgroup), 2);
            //buffer ref count is 3: test, command_encoder and rawbindgroup
            assert_eq!(Arc::strong_count(&rawbuffer), 3);
        }
        let mut gpuopt = ENGINE.gpu.lock();
        let gpuopt2 = gpuopt.as_mut().unwrap();
        let gpu = gpuopt2.as_mut().unwrap();

        //buffer ref count is 3: test, command_encoder, rawbindgroup
        assert_eq!(Arc::strong_count(&rawbuffer), 3);

        let mut renderpass_encoder = command_encoder.begin_render_pass(
            &String::from("test"),
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        renderbundle_encoder.record_renderbundle(
            &gpu.renderpasses[0].cameragroups(),
            &gpu.device,
            &gpu.cameras,
            1,
            &bindgroup,
            |renderbundle| {
                renderpass_encoder.execute_bundles(renderbundle);
            },
        );
        drop(renderbundle_encoder);

        {
            //bindgroup 2 ref: test, renderpass_encoder
            assert_eq!(Arc::strong_count(&rawbindgroup), 2);
            //buffer ref count is 3: test, command_encoder, rawbindgroup
            assert_eq!(Arc::strong_count(&rawbuffer), 3);
        }
        let command_encoder = renderpass_encoder.end();
        {
            let command_buffer = command_encoder.finish(String::from("test"));
            //buffer ref count is 3: test, command_encoder, rawbindgroup
            assert_eq!(Arc::strong_count(&rawbuffer), 3);

            let queue = Queue {
                externref: Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
                pending_command_buffers: Vec::new(),
            };
            //bindgroup 2 ref: test, command_buffer
            assert_eq!(Arc::strong_count(&rawbindgroup), 2);
            queue.submit([command_buffer]);
        }
        {
            //bindgroup 1 ref: test
            assert_eq!(Arc::strong_count(&rawbindgroup), 1);
            assert_eq!(Arc::strong_count(&rawbuffer), 2);
        }
    }
}
