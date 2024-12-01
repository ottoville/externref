use std::ops::Deref;

use externref::Resource;

#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
use super::buffer::{create_gpu_buffer, set_mapped_range, unmap};
use super::buffer::{GPUBuffer, GpuBuffer, JSBuffer};
use super::mappadle_buffer::MappadleGPUBuffer;
use super::usages::COPYSRC_USAGE;
use crate::MULTIVALUE_USIZE;

// Todo: set inner buffer to private
pub struct MappedGPUBuffer<B: GpuBuffer>(pub B);

#[no_mangle]
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
pub unsafe extern "C" fn create_mapped_GPU_buffer_copysrc(
    length: usize,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> *const MappedGPUBuffer<GPUBuffer<COPYSRC_USAGE>> {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    Box::into_raw(Box::new(
        MappedGPUBuffer::<GPUBuffer<COPYSRC_USAGE>>::new_gpubuffer(length, label, true),
    ))
}

pub trait MappedgpuBuffer<const U: u32>: GpuBuffer {
    #[cfg(feature = "webgpu")]
    #[cfg(any(not(test), rust_analyzer))]
    fn new_mappadle_gpubuffer(
        size: usize,
        label: String,
        owned_by_js: bool,
    ) -> MappedGPUBuffer<MappadleGPUBuffer<U>> {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();

            let externref =
                create_gpu_buffer(size, MULTIVALUE_USIZE.as_ptr(), U, true, owned_by_js);
            return MappedGPUBuffer(MappadleGPUBuffer::new(GPUBuffer {
                externref,
                label,
                owned_by_js,
                size,
            }));
        }
    }
    #[cfg(feature = "webgpu")]
    #[cfg(any(not(test), rust_analyzer))]
    fn new_gpubuffer(
        size: usize,
        label: String,
        owned_by_js: bool,
    ) -> MappedGPUBuffer<GPUBuffer<U>> {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();

            let externref =
                create_gpu_buffer(size, MULTIVALUE_USIZE.as_ptr(), U, true, owned_by_js);
            return MappedGPUBuffer(GPUBuffer {
                externref,
                label,
                owned_by_js,
                size,
            });
        }
    }
}
impl<const U: u32> GpuBuffer for MappedGPUBuffer<GPUBuffer<U>> {
    fn externref(&self) -> &Resource<JSBuffer> {
        &self.externref
    }
    fn label(&self) -> &String {
        &self.label
    }
    fn owned_by_js(&self) -> bool {
        self.owned_by_js
    }
    fn usages(&self) -> u32 {
        U
    }
    fn size(&self) -> usize {
        self.size
    }
    fn set_size(&mut self, size: usize) {
        self.0.set_size(size);
    }
    fn replace_externref(&mut self, externref: Resource<JSBuffer>) -> Resource<JSBuffer> {
        self.0.replace_externref(externref)
    }
}
impl<const U: u32> GpuBuffer for MappedGPUBuffer<MappadleGPUBuffer<U>> {
    fn externref(&self) -> &Resource<JSBuffer> {
        &self.externref
    }
    fn label(&self) -> &String {
        &self.label
    }
    fn owned_by_js(&self) -> bool {
        self.owned_by_js
    }
    fn usages(&self) -> u32 {
        U
    }
    fn size(&self) -> usize {
        self.size
    }
    fn set_size(&mut self, size: usize) {
        self.0.set_size(size);
    }
    fn replace_externref(&mut self, externref: Resource<JSBuffer>) -> Resource<JSBuffer> {
        self.0.replace_externref(externref)
    }
}
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
impl<B: GpuBuffer> MappedGPUBuffer<B> {
    pub fn set_mapped_range(
        &self,
        ptr: usize,
        size: usize,
        buffer_offset: usize,
        buffer_size: usize,
    ) {
        unsafe {
            set_mapped_range(&self.0.externref(), ptr, size, buffer_offset, buffer_size);
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
