use std::{cell::RefCell, num::NonZeroUsize, rc::Rc};

use crate::bindgroup::{bindgroup::Bindable, bindgroup_entry::BindGroupBinding};
use crate::buffer::mapped_buffer::MappedGPUBuffer;
use crate::device::JSDevice;
use crate::renderbundle::RenderBundle;
use crate::weakvec::WeakVec;
use externref::{externref, Resource};

pub struct JSBuffer(());
pub struct BufferRef(pub Resource<JSBuffer>);
impl Bindable for BufferRef {}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_buffer(
    _device: &Resource<JSDevice>,
    _size: NonZeroUsize,
    _label_ptr: usize,
    _label_len: usize,
    _usages: u32,
    _mapped: bool,
) -> Resource<JSBuffer> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn destroy(_buffer: &Resource<JSBuffer>) {}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "device")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_buffer(
        device: &Resource<JSDevice>,
        size: NonZeroUsize,
        label_ptr: usize,
        label_len: usize,
        usages: u32,
        mapped: bool,
    ) -> Resource<JSBuffer>;
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "buffer")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn map_state(buffer: &Resource<JSBuffer>) -> u32;
    fn destroy(buffer: &Resource<JSBuffer>);
}

#[no_mangle]
#[externref]
pub unsafe extern "C" fn get_raw_buffer(
    buffer: *const GPUBuffer<false, false, true>,
) -> &'static Resource<JSBuffer> {
    &(&(*buffer).externref).0
}

pub struct GPUBuffer<
    const MAP_READ: bool,
    const MAP_WRITE: bool = false,
    const COPY_SRC: bool = false,
    const COPY_DST: bool = false,
    const INDEX: bool = false,
    const VERTEX: bool = false,
    const UNIFORM: bool = false,
    const STORAGE: bool = false,
    const INDIRECT: bool = false,
    const QUERY_RESOLVE: bool = false,
> {
    pub externref: Rc<BufferRef>,
    pub label: String,
    pub size: NonZeroUsize,
    pub bindings: WeakVec<RefCell<dyn BindGroupBinding>>,
    pub renderbundles: WeakVec<RefCell<Option<RenderBundle>>>,
}
impl<
        const MAP_READ: bool,
        const MAP_WRITE: bool,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const INDEX: bool,
        const VERTEX: bool,
        const UNIFORM: bool,
        const STORAGE: bool,
        const INDIRECT: bool,
        const QUERY_RESOLVE: bool,
    >
    GPUBuffer<
        MAP_READ,
        MAP_WRITE,
        COPY_SRC,
        COPY_DST,
        INDEX,
        VERTEX,
        UNIFORM,
        STORAGE,
        INDIRECT,
        QUERY_RESOLVE,
    >
{
    pub const fn usages() -> u32 {
        let mut usages = 0;
        if MAP_READ {
            usages |= 0x0001;
        }
        if MAP_WRITE {
            usages |= 0x0002;
        }
        if COPY_SRC {
            usages |= 0x0004;
        }
        if COPY_DST {
            usages |= 0x0008;
        }
        if INDEX {
            usages |= 0x0010;
        }
        if VERTEX {
            usages |= 0x0020;
        }
        if UNIFORM {
            usages |= 0x0040;
        }
        if STORAGE {
            usages |= 0x0080;
        }
        if INDIRECT {
            usages |= 0x0100;
        }
        if QUERY_RESOLVE {
            usages |= 0x0200;
        }
        return usages;
    }
    fn inner_new(
        device: &Resource<JSDevice>,
        size: NonZeroUsize,
        label: String,
        mapped: bool,
    ) -> Self {
        let externref = unsafe {
            create_buffer(
                device,
                size,
                label.as_ptr() as usize,
                label.len(),
                Self::usages(),
                mapped,
            )
        };
        GPUBuffer {
            externref: Rc::new(BufferRef(externref)),
            label,
            size,
            bindings: WeakVec::new(),
            renderbundles: WeakVec::new(),
        }
    }
    pub fn new(device: &Resource<JSDevice>, size: NonZeroUsize, label: String) -> Self {
        return GPUBuffer::<
            MAP_READ,
            MAP_WRITE,
            COPY_SRC,
            COPY_DST,
            INDEX,
            VERTEX,
            UNIFORM,
            STORAGE,
            INDIRECT,
            QUERY_RESOLVE,
        >::inner_new(device, size, label, false);
    }
    pub fn new_mapped(
        device: &Resource<JSDevice>,
        size: NonZeroUsize,
        label: String,
    ) -> MappedGPUBuffer<
        MAP_READ,
        MAP_WRITE,
        COPY_SRC,
        COPY_DST,
        INDEX,
        VERTEX,
        UNIFORM,
        STORAGE,
        INDIRECT,
        QUERY_RESOLVE,
    > {
        return MappedGPUBuffer::new(Self::inner_new(device, size, label, true));
    }
    pub fn map_state(&self) -> u32 {
        #[cfg(target_arch = "wasm32")]
        unsafe {
            map_state(&self.externref.0)
        }

        #[cfg(not(target_arch = "wasm32"))]
        return 2;
    }
    pub fn make_dirty(&mut self) {
        self.bindings.iter_mut(|buffer_binding| {
            buffer_binding.borrow_mut().make_dirty();
        });
        self.renderbundles.iter_mut(|renderbundle| {
            renderbundle.borrow_mut().take();
        });
    }
    pub fn resize_zeroed(&mut self, device: &Resource<JSDevice>, size: NonZeroUsize) {
        self.size = size;
        self.externref = Rc::new(BufferRef(unsafe {
            create_buffer(
                device,
                size,
                self.label.as_ptr() as usize,
                self.label.len(),
                Self::usages(),
                false,
            )
        }));
        self.make_dirty();
    }
    pub fn take_externref(self) -> Rc<BufferRef> {
        self.externref
    }
    pub fn replace_externref(&mut self, externref: Rc<BufferRef>) -> Rc<BufferRef> {
        self.make_dirty();
        return std::mem::replace(&mut self.externref, externref);
    }
    pub fn replace(&mut self, buffer: Self) {
        self.replace_externref(buffer.externref);
        self.size = buffer.size;
        self.make_dirty();
    }
}
impl Drop for BufferRef {
    fn drop(&mut self) {
        unsafe { destroy(&self.0) };
    }
}
