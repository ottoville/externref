use std::sync::{Arc, Weak};
use std::{rc::Rc, sync::Mutex};

use externref::Resource;

use crate::MULTIVALUE_USIZE;

use super::buffer::buffer::JSBuffer;
use super::bufferbinding::BufferBinding;
use super::gpu::create_bind_group;
use super::gpu::JSDevice;
use super::renderbundle::RenderBundle;

#[no_mangle]
pub unsafe extern "C" fn iterate_bindings(
    iterator: *mut std::slice::Iter<'_, Rc<Mutex<BufferBinding>>>,
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
pub struct JSBindGroupLayout(());

pub struct BindGroup {
    pub resources: Mutex<Option<Arc<BindGroupResources>>>,
    label: String,
    layout: Arc<Resource<JSBindGroupLayout>>,
    bufferbindings: Vec<Arc<Mutex<BufferBinding>>>,
    pub renderbundles: Mutex<Vec<Weak<Mutex<Option<RenderBundle>>>>>,
}
pub struct BindGroupResources {
    pub externref: Resource<JSBindGroup>,
    pub rawbuffers: Vec<Arc<Resource<JSBuffer>>>,
}
impl BindGroup {
    pub fn new(
        label: String,
        layout: Arc<Resource<JSBindGroupLayout>>,
        bufferbindings: Vec<Arc<Mutex<BufferBinding>>>,
    ) -> Arc<BindGroup> {
        let bind_group = Arc::new(BindGroup {
            resources: Mutex::new(None),
            label,
            layout,
            bufferbindings,
            renderbundles: Mutex::new(Vec::new()),
        });
        for buffer_binding_mutex in bind_group.bufferbindings.iter() {
            let mut buffer_binding = buffer_binding_mutex.lock().unwrap();
            buffer_binding.bindgroups.push(Arc::downgrade(&bind_group));
            buffer_binding
                .buffer
                .lock()
                .unwrap()
                .add_buffer_binding(Arc::downgrade(buffer_binding_mutex));
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
    pub fn make_dirty(&self) {
        self.resources.lock().unwrap().take();
        for somerenderbundle in self.renderbundles.lock().unwrap().iter() {
            if let Some(renderbundle) = somerenderbundle.upgrade() {
                renderbundle.lock().unwrap().take();
            }
        }
    }
}

#[cfg(test)]
#[test]
fn test_bindgroup() {
    use super::gpu::{create_bind_group, init_gpu};
    use super::renderbundle::{RenderBundle, RenderBundleEncoder};
    use crate::engine;
    use crate::gpu::command_encoder::GPUCommandEncoder;
    use crate::gpu::queue::Queue;
    use crate::gpu::{
        binding_commands::BindingCommands,
        buffer::{
            buffer::GPUBuffer,
            usages::{STORAGE_USAGE, UNIFORM_COPYDST_USAGE},
        },
    };
    use crate::mesh::ENGINE;
    use externref::ExternRef;

    unsafe {
        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            false,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );

        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
        let mut renderbundle_encoder = RenderBundleEncoder::new(
            String::from("test"),
            &device,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        let buffer =
            GPUBuffer::<UNIFORM_COPYDST_USAGE>::new(&device, 4, String::from("test"), false);
        let rawbuffer = buffer.externref.clone();
        let bindgroup = BindGroup::new(
            String::from("test"),
            Arc::new(Resource::new_non_null(std::mem::transmute::<
                usize,
                ExternRef,
            >(1))),
            vec![BufferBinding::new(Arc::new(Mutex::new(buffer)), 0, None)],
        );
        {
            //Externref is not set yet, as it is set lazily
            assert_eq!(bindgroup.resources.lock().unwrap().is_none(), true);
            //buffer ref count is 2, one from test and other from bindgroup
            assert_eq!(Arc::strong_count(&rawbuffer), 2);
        }

        renderbundle_encoder.set_bindgroup(&device, 0, &*bindgroup, &[]);
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
        let mut gpuopt2 = gpuopt.as_mut().unwrap();
        let gpu = gpuopt2.as_mut().unwrap();

        let renderbundle =
            renderbundle_encoder.record_renderbundle(&gpu.device, &gpu.cameras, 1, &bindgroup);
        drop(renderbundle_encoder);

        assert_eq!(Arc::strong_count(&rawbuffer), 3);
        let mut command_encoder = GPUCommandEncoder::new(String::from("test"));

        let mut renderpass_encoder = command_encoder.begin_render_pass(
            &String::from("test"),
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        renderpass_encoder.execute_bundles(renderbundle.lock().unwrap().as_ref().unwrap());
        drop(renderbundle);

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
            };
            //bindgroup 2 ref: test, command_buffer
            assert_eq!(Arc::strong_count(&rawbindgroup), 2);
            queue.submit(&mut vec![command_buffer].drain(..));
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
    use crate::gpu::buffer::copy_src::CopySrc;
    use crate::gpu::command_encoder::GPUCommandEncoder;
    use crate::gpu::queue::Queue;
    use crate::gpu::{
        binding_commands::BindingCommands,
        buffer::{
            buffer::GPUBuffer,
            usages::{
                COPYSRC_USAGE, STORAGE_USAGE, UNIFORM_COPYDST_USAGE,
                UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE,
            },
        },
    };
    use crate::mesh::ENGINE;
    use externref::ExternRef;

    unsafe {
        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
        let mut command_encoder = GPUCommandEncoder::new(String::from("test"));

        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            false,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );

        let mut renderbundle_encoder = RenderBundleEncoder::new(
            String::from("test"),
            &device,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        let buffer = GPUBuffer::<UNIFORM_STORAGE_COPYSRC_COPYDST_USAGE>::new(
            &device,
            4,
            String::from("test"),
            false,
        );
        let rawbuffer = buffer.externref.clone();
        let buffer_arc = Arc::new(Mutex::new(buffer));
        let bindgroup = BindGroup::new(
            String::from("test"),
            Arc::new(Resource::new_non_null(std::mem::transmute::<
                usize,
                ExternRef,
            >(1))),
            vec![BufferBinding::new(buffer_arc.clone(), 0, None)],
        );
        {
            //Externref is not set yet, as it is set lazily
            assert_eq!(bindgroup.resources.lock().unwrap().is_none(), true);
            //buffer ref count is 2, one from test and other from bindgroup
            assert_eq!(Arc::strong_count(&rawbuffer), 2);
        }

        renderbundle_encoder.set_bindgroup(&device, 0, &*bindgroup, &[]);
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
        let mut gpuopt2 = gpuopt.as_mut().unwrap();
        let gpu = gpuopt2.as_mut().unwrap();

        let renderbundle =
            renderbundle_encoder.record_renderbundle(&gpu.device, &gpu.cameras, 1, &bindgroup);
        drop(renderbundle_encoder);
        //buffer ref count is 3: test, command_encoder, rawbindgroup
        assert_eq!(Arc::strong_count(&rawbuffer), 3);

        let mut renderpass_encoder = command_encoder.begin_render_pass(
            &String::from("test"),
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        renderpass_encoder.execute_bundles(renderbundle.lock().unwrap().as_ref().unwrap());
        drop(renderbundle);

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
            };
            //bindgroup 2 ref: test, command_buffer
            assert_eq!(Arc::strong_count(&rawbindgroup), 2);
            queue.submit(&mut vec![command_buffer].drain(..));
        }
        {
            //bindgroup 1 ref: test
            assert_eq!(Arc::strong_count(&rawbindgroup), 1);
            assert_eq!(Arc::strong_count(&rawbuffer), 2);
        }
    }
}
