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
    pub externref: Option<Arc<Resource<JSBindGroup>>>,
    label: String,
    layout: Arc<Resource<JSBindGroupLayout>>,
    bufferbindings: Vec<Arc<Mutex<BufferBinding>>>,
    pub rawbuffers: Vec<Arc<Resource<JSBuffer>>>,
    pub renderbundles: Vec<Weak<Mutex<Option<RenderBundle>>>>,
}

impl BindGroup {
    pub fn new(
        label: String,
        layout: Arc<Resource<JSBindGroupLayout>>,
        bufferbindings: Vec<Arc<Mutex<BufferBinding>>>,
    ) -> Arc<Mutex<BindGroup>> {
        let bind_group = Arc::new(Mutex::new(BindGroup {
            externref: None,
            label,
            layout,
            bufferbindings,
            rawbuffers: Vec::new(),
            renderbundles: Vec::new(),
        }));
        for buffer_binding_mutex in bind_group.lock().unwrap().bufferbindings.iter() {
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
    pub fn get_bindgroup(&mut self, device: &Resource<JSDevice>) -> Arc<Resource<JSBindGroup>> {
        let extenref_resources = self.externref.get_or_insert_with(|| {
            self.rawbuffers.clear();
            for binding in self.bufferbindings.iter() {
                let buffer_binding = binding.lock().unwrap();
                self.rawbuffers
                    .push(buffer_binding.buffer.lock().unwrap().externref_arc());
            }

            let bindings_iterator = Box::new(self.bufferbindings.iter());
            Arc::new(unsafe {
                MULTIVALUE_USIZE[0] = self.label.as_ptr() as usize;
                MULTIVALUE_USIZE[1] = self.label.len();
                MULTIVALUE_USIZE[2] = self.label.capacity();
                create_bind_group(
                    device,
                    &self.layout,
                    MULTIVALUE_USIZE.as_ptr(),
                    Box::into_raw(bindings_iterator),
                )
            })
        });
        return extenref_resources.clone();
    }
    pub fn make_dirty(&mut self) {
        self.externref.take();
        for somerenderbundle in self.renderbundles.iter() {
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
            assert_eq!(bindgroup.lock().unwrap().externref.is_none(), true);
            //buffer ref count is 2, one from test and other from bindgroup
            assert_eq!(Arc::strong_count(&rawbuffer), 2);
        }

        renderbundle_encoder.set_bindgroup(&device, 0, &mut *bindgroup.lock().unwrap(), &[]);
        let rawbindgroup = bindgroup
            .lock()
            .as_ref()
            .unwrap()
            .externref
            .as_ref()
            .unwrap()
            .clone();
        {
            //bindgroup 3 ref: test, bindgroup, renderbundle_encoder
            assert_eq!(Arc::strong_count(&rawbindgroup), 3);
            assert_eq!(Arc::strong_count(&rawbuffer), 3);
        }
        bindgroup.lock().unwrap().make_dirty();
        {
            //bindgroup 2 ref: test, renderbundle_encoder
            assert_eq!(Arc::strong_count(&rawbindgroup), 2);
            assert_eq!(Arc::strong_count(&rawbuffer), 3);
        }
        let mut gpuopt = ENGINE.gpu.lock();
        let mut gpuopt2 = gpuopt.as_mut().unwrap();
        let gpu = gpuopt2.as_mut().unwrap();

        let renderbundle = renderbundle_encoder.record_renderbundle(&gpu.device, &gpu.cameras, 1, &bindgroup);
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
