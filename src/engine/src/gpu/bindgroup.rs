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
    pub externref: Option<Resource<JSBindGroup>>,
    label: String,
    layout: Resource<JSBindGroupLayout>,
    bufferbindings: Vec<Arc<Mutex<BufferBinding>>>,
    pub rawbuffers: Vec<Arc<Resource<JSBuffer>>>,
    pub renderbundles: Vec<Weak<Mutex<Option<RenderBundle>>>>,
}

impl BindGroup {
    pub fn new(
        label: String,
        layout: Resource<JSBindGroupLayout>,
        bufferbindings: Vec<Arc<Mutex<BufferBinding>>>,
    ) -> Arc<Mutex<BindGroup>> {
        let mut rawbuffers = Vec::new();
        for binding in bufferbindings.iter() {
            let buffer_binding = binding.lock().unwrap();
            rawbuffers.push(buffer_binding.buffer.lock().unwrap().externref_arc());
        }
        let bind_group = Arc::new(Mutex::new(BindGroup {
            externref: None,
            label,
            layout,
            bufferbindings,
            rawbuffers,
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
    pub fn get_bind_group(&mut self, device: &Resource<JSDevice>) -> &Resource<JSBindGroup> {
        self.externref.get_or_insert_with(|| {
            self.rawbuffers.clear();
            for binding in self.bufferbindings.iter() {
                let buffer_binding = binding.lock().unwrap();
                self.rawbuffers
                    .push(buffer_binding.buffer.lock().unwrap().externref_arc());
            }

            let bindings_iterator = Box::new(self.bufferbindings.iter());
            unsafe {
                MULTIVALUE_USIZE[0] = self.label.as_ptr() as usize;
                MULTIVALUE_USIZE[1] = self.label.len();
                MULTIVALUE_USIZE[2] = self.label.capacity();
                create_bind_group(
                    device,
                    &self.layout,
                    MULTIVALUE_USIZE.as_ptr(),
                    Box::into_raw(bindings_iterator),
                )
            }
        })
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
