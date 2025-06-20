use std::ops::Deref;

use super::buffer::{GPUBuffer, GpuBuffer};
use super::usages::COPYSRC_USAGE;
use externref::{externref, Resource};

use crate::gpu::buffer::buffer::JSBuffer;
use crate::gpu::gpu::JSDevice;

#[cfg(test)]
pub unsafe fn set_mapped_range(
    _buffer: &Resource<JSBuffer>,
    _offset: usize,
    _size: usize,
    _buffer_offset: usize,
) {
}
#[cfg(test)]
pub unsafe fn unmap(_buffer: &Resource<JSBuffer>) {}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "buffer")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn set_mapped_range(
        buffer: &Resource<JSBuffer>,
        offset: usize,
        size: usize,
        buffer_offset: usize,
    );
    pub fn unmap(buffer: &Resource<JSBuffer>);
}


// Todo: set inner buffer to private
pub struct MappedGPUBuffer<B: GpuBuffer>(B);

#[no_mangle]
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
#[externref]
pub unsafe extern "C" fn create_mapped_GPU_buffer_copysrc(
    device: &Resource<JSDevice>,
    length: usize,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> *const MappedGPUBuffer<GPUBuffer<COPYSRC_USAGE>> {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    Box::into_raw(Box::new(GPUBuffer::new_mapped(device, length, label, true)))
}

impl<B: GpuBuffer> MappedGPUBuffer<B> {
    pub fn new(buffer: B) -> MappedGPUBuffer<B> {
        MappedGPUBuffer(buffer)
    }
    pub fn set_mapped_range_raw(&self, ptr: usize, size: usize, buffer_offset: usize) {
        unsafe {
            set_mapped_range(&self.0.externref(), ptr, size, buffer_offset);
        }
    }
    pub fn set_mapped_range<T>(&self, data: &T, buffer_offset: usize) {
        unsafe {
            set_mapped_range(
                &self.0.externref(),
                data as *const T as usize,
                size_of::<T>(),
                buffer_offset,
            );
        }
    }
    pub fn unmap(self) -> B {
        unsafe {
            unmap(&self.0.externref());
        }
        self.0
    }
}
impl<B: GpuBuffer> Deref for MappedGPUBuffer<B> {
    type Target = B;
    fn deref(&self) -> &B {
        &self.0
    }
}
