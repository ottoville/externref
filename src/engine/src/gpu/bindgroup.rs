use std::{rc::Rc, sync::Mutex};

use externref::Resource;

use crate::MULTIVALUE_USIZE;

use super::buffer::buffer::JSBuffer;
use super::bufferbinding::BufferBinding;
use super::gpu::create_bind_group;
use super::gpu::JSDevice;

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
                None => buffer.size(),
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
    pub dirty: bool,
    externref: Resource<JSBindGroup>,
    label: String,
    layout: Resource<JSBindGroupLayout>,
    bufferbindings: Vec<Rc<Mutex<BufferBinding>>>,
}

impl BindGroup {
    pub fn new(
        device: &Resource<JSDevice>,
        label: String,
        layout: Resource<JSBindGroupLayout>,
        bufferbindings: Vec<Rc<Mutex<BufferBinding>>>,
    ) -> Rc<Mutex<BindGroup>> {
        let bindings_iterator = Box::new(bufferbindings.iter());
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();

            let bind_group = Rc::new(Mutex::new(BindGroup {
                dirty: true,
                externref: create_bind_group(
                    device,
                    &layout,
                    MULTIVALUE_USIZE.as_ptr(),
                    Box::into_raw(bindings_iterator),
                ),
                label,
                layout,
                bufferbindings,
            }));
            for buffer_binding_mutex in bind_group.lock().unwrap().bufferbindings.iter() {
                BufferBinding::get_binding(buffer_binding_mutex, Rc::downgrade(&bind_group));
            }
            return bind_group;
        }
    }
    pub fn get_bind_group(&mut self, device: &Resource<JSDevice>) -> &Resource<JSBindGroup> {
        if self.dirty {
            let bindings_iterator = Box::new(self.bufferbindings.iter());
            unsafe {
                MULTIVALUE_USIZE[0] = self.label.as_ptr() as usize;
                MULTIVALUE_USIZE[1] = self.label.len();
                MULTIVALUE_USIZE[2] = self.label.capacity();
                self.externref = create_bind_group(
                    device,
                    &self.layout,
                    MULTIVALUE_USIZE.as_ptr(),
                    Box::into_raw(bindings_iterator),
                );
            }
            self.dirty = false;
        }
        return &self.externref;
    }
}
