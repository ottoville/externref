use std::cell::Cell;
use std::sync::Mutex;
use std::sync::{Arc, Weak};

use crate::bindgroup::bindgroup_trait::BindGroupTrait;
use crate::bindgroup_layout::{BindGroupLayout, JSBindGroupLayout};
use crate::buffer::buffer::BufferRef;
use crate::device::{create_bind_group, JSDevice};
use externref::Resource;

use crate::bindgroup::bindgroup_resources::BindGroupResources;
use crate::bufferbinding::BufferBinding;
use crate::renderbundle::RenderBundle;

thread_local! {
    static BUFFER_BINDING: Cell<[usize;3]> = const { Cell::new([0,0,0]) };
}

#[no_mangle]
pub unsafe extern "C" fn iterate_bindings(
    iterator: *mut std::slice::Iter<'_, Arc<Mutex<BufferBinding>>>,
) -> *const [usize; 3] {
    use std::ptr;

    let maybebinding = (*iterator).next();
    match maybebinding {
        Some(bindingmutex) => {
            let binding = bindingmutex.lock().unwrap();
            let buffer = binding.buffer.lock().unwrap();
            return BUFFER_BINDING.with(|buffer_binding| {
                buffer_binding.set([
                    ptr::read(buffer.externref() as *const BufferRef as *const usize),
                    binding.offset,
                    match binding.size {
                        Some(size) => size.get(),
                        None => buffer.size() - binding.offset,
                    },
                ]);
                return buffer_binding.as_ptr();
            });
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
                create_bind_group(
                    device,
                    &self.layout,
                    self.label.as_ptr() as usize,
                    self.label.len(),
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
