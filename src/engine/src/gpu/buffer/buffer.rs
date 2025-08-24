use std::sync::Arc;
use std::sync::{Mutex, Weak};

use externref::{externref, Resource};

use crate::gpu::buffer::mapped_buffer::MappedGPUBuffer;
use crate::gpu::bufferbinding::BufferBinding;
use crate::gpu::gpu::JSDevice;
use crate::gpu::renderbundle::RenderBundle;

pub struct JSBuffer(());

#[cfg(test)]
pub unsafe fn create_buffer(
    _device: &Resource<JSDevice>,
    _length: usize,
    _label_ptr: usize,
    _label_len: usize,
    _usages: u32,
    _mapped: bool,
    _owned_by_js: bool,
) -> Resource<JSBuffer> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "device")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_buffer(
        device: &Resource<JSDevice>,
        length: usize,
        label_ptr: usize,
        label_len: usize,
        usages: u32,
        mapped: bool,
        owned_by_js: bool,
    ) -> Resource<JSBuffer>;
}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "buffer")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn map_state(buffer: &Resource<JSBuffer>) -> u32;
}

#[no_mangle]
#[cfg(feature = "webgpu")]
#[externref]
pub unsafe extern "C" fn get_raw_buffer(
    buffer: *const GPUBuffer<false, false, true>,
) -> &'static Resource<JSBuffer> {
    &(*buffer).externref
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
    pub externref: Arc<Resource<JSBuffer>>,
    pub label: String,
    pub owned_by_js: bool,
    pub size: usize,
    pub buffer_bindings: Vec<Weak<Mutex<BufferBinding>>>,
    pub renderbundles: Vec<Weak<Mutex<Option<RenderBundle>>>>,
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
        size: usize,
        label: String,
        owned_by_js: bool,
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
                owned_by_js,
            )
        };
        GPUBuffer {
            externref: Arc::new(externref),
            label,
            owned_by_js,
            size,
            buffer_bindings: Vec::new(),
            renderbundles: Vec::new(),
        }
    }
    pub fn new(device: &Resource<JSDevice>, size: usize, label: String, owned_by_js: bool) -> Self {
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
        >::inner_new(device, size, label, owned_by_js, false);
    }
    pub fn new_mapped(
        device: &Resource<JSDevice>,
        size: usize,
        label: String,
        owned_by_js: bool,
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
        return MappedGPUBuffer::new(Self::inner_new(device, size, label, owned_by_js, true));
    }
    pub fn map_state(&self) -> u32 {
        #[cfg(feature = "webgpu")]
        #[cfg(any(not(test), rust_analyzer))]
        unsafe {
            map_state(&self.externref)
        }

        #[cfg(test)]
        return 2;
    }
    pub fn make_dirty(&self) {
        for some_buffer_binding in self.buffer_bindings.iter() {
            if let Some(buffer_binding) = some_buffer_binding.upgrade() {
                buffer_binding.lock().unwrap().make_dirty();
            }
        }
        for somerenderbundle in &self.renderbundles {
            if let Some(renderbundle) = somerenderbundle.upgrade() {
                renderbundle.lock().unwrap().take();
            }
        }
    }
    pub fn resize_zeroed(&mut self, device: &Resource<JSDevice>, size: usize) {
        self.size = size;
        self.externref = Arc::new(unsafe {
            create_buffer(
                device,
                size,
                self.label.as_ptr() as usize,
                self.label.len(),
                Self::usages(),
                false,
                self.owned_by_js,
            )
        });
        self.make_dirty();
    }
    pub fn take_externref(self) -> Arc<Resource<JSBuffer>> {
        self.externref
    }
    pub fn replace_externref(
        &mut self,
        externref: Arc<Resource<JSBuffer>>,
    ) -> Arc<Resource<JSBuffer>> {
        self.make_dirty();
        return std::mem::replace(&mut self.externref, externref);
    }
    pub fn replace(&mut self, buffer: Self) {
        self.replace_externref(buffer.externref);
        self.size = buffer.size;
        self.make_dirty();
    }
}
