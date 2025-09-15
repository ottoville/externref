use std::ops::Deref;

use externref::{externref, Resource};

use crate::buffer::buffer::{GPUBuffer, JSBuffer};
use crate::device::JSDevice;
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn set_mapped_range(
    _buffer: &Resource<JSBuffer>,
    _offset: usize,
    _size: usize,
    _buffer_offset: usize,
) {
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn get_mapped_range(
    _buffer: &Resource<JSBuffer>,
    _offset: usize,
    _size: usize,
    _buffer_offset: usize,
) {
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn unmap(_buffer: &Resource<JSBuffer>) {}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "buffer")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn get_mapped_range(
        buffer: &Resource<JSBuffer>,
        offset: usize,
        size: usize,
        buffer_offset: usize,
    );
    pub fn set_mapped_range(
        buffer: &Resource<JSBuffer>,
        offset: usize,
        size: usize,
        buffer_offset: usize,
    );
    pub fn unmap(buffer: &Resource<JSBuffer>);
}

pub struct MappedGPUBuffer<
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
>(
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
    >,
);

#[no_mangle]
#[externref]
pub unsafe extern "C" fn create_mapped_gpu_buffer_copysrc(
    device: &Resource<JSDevice>,
    length: usize,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> *const MappedGPUBuffer<false, false, true> {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    Box::into_raw(Box::new(GPUBuffer::new_mapped(device, length, label, true)))
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
    MappedGPUBuffer<
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
    pub fn new(
        buffer: GPUBuffer<
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
        >,
    ) -> Self {
        MappedGPUBuffer(buffer)
    }
    pub fn get_mapped_range_raw(&self, ptr: usize, size: usize, buffer_offset: usize) {
        unsafe {
            get_mapped_range(&self.0.externref, ptr, size, buffer_offset);
        }
    }
    pub fn get_mapped_range<T>(&self, data: &mut T, buffer_offset: usize) {
        unsafe {
            get_mapped_range(
                &self.0.externref,
                data as *const T as usize,
                size_of::<T>(),
                buffer_offset,
            );
        }
    }
    pub fn set_mapped_range_raw(&self, ptr: usize, size: usize, buffer_offset: usize) {
        unsafe {
            set_mapped_range(&self.0.externref, ptr, size, buffer_offset);
        }
    }
    pub fn set_mapped_range<T>(&self, data: &T, buffer_offset: usize) {
        unsafe {
            set_mapped_range(
                &self.0.externref,
                data as *const T as usize,
                size_of::<T>(),
                buffer_offset,
            );
        }
    }
    pub fn unmap(
        self,
    ) -> GPUBuffer<
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
        unsafe {
            unmap(&self.0.externref);
        }
        self.0
    }
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
    > Deref
    for MappedGPUBuffer<
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
    type Target = GPUBuffer<
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
    >;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
