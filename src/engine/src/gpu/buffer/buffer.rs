use std::mem;

use externref::{externref, Resource};

use crate::{engine::GPUCommandEncoder, MULTIVALUE_USIZE};

use super::usages::COPYSRC_USAGE;

pub struct JSBuffer(());

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "buffer")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_gpu_buffer(
        length: usize,
        label: *const usize,
        usages: u32,
        mapped: bool,
        owned_by_js: bool,
    ) -> Resource<JSBuffer>;
    pub fn set_mapped_range(
        buffer: &Resource<JSBuffer>,
        offset: usize,
        size: usize,
        buffer_offset: usize,
        buffer_size: usize,
    );
    pub fn copy_from(
        command_encoder: &Resource<GPUCommandEncoder>,
        destination: &Resource<JSBuffer>,
        source: &Resource<JSBuffer>,
        sourceOffset: usize,
        destinationOffset: usize,
        copySize: usize,
    );
    pub fn unmap(buffer: &Resource<JSBuffer>);
    pub fn write(buffer: &Resource<JSBuffer>, ptr: usize, size: usize, buffer_offset: usize);
}

#[no_mangle]
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
pub unsafe extern "C" fn create_mapped_GPU_buffer_copysrc(
    length: usize,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> *const MappedGPUBuffer<COPYSRC_USAGE> {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    Box::into_raw(Box::new(MappedGPUBuffer::<COPYSRC_USAGE>::new(
        length, label, true,
    )))
}
#[no_mangle]
#[cfg(feature = "webgpu")]
#[externref]
pub unsafe extern "C" fn get_raw_buffer(
    buffer: *const GPUBuffer<COPYSRC_USAGE>,
) -> &'static Resource<JSBuffer> {
    &(*buffer).externref
}
pub struct GPUBuffer<const U: u32> {
    pub externref: Resource<JSBuffer>,
    pub label: String,
    owned_by_js: bool,
    pub size: usize,
}
pub struct MappedGPUBuffer<const U: u32>(pub GPUBuffer<U>);
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
impl<const U: u32> MappedGPUBuffer<U> {
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
    pub fn unmap(self) -> GPUBuffer<U> {
        unsafe {
            unmap(&self.0.externref);
        }
        self.0
    }
    pub fn new(size: usize, label: String, owned_by_js: bool) -> MappedGPUBuffer<U> {
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
//////////////////////////////
pub trait GpuBuffer {
    fn externref(&self) -> &Resource<JSBuffer>;
    fn label(&self) -> &String;
    fn usages(&self) -> u32;
    fn owned_by_js(&self) -> bool;
    fn size(&self) -> usize;
    fn set_size(&mut self, size: usize);
    fn replace_externref(&mut self, externref: Resource<JSBuffer>) -> Resource<JSBuffer>;
}

impl<const U: u32> GpuBuffer for GPUBuffer<U> {
    fn externref(&self) -> &Resource<JSBuffer> {
        &self.externref
    }
    fn label(&self) -> &String {
        &self.label
    }
    fn usages(&self) -> u32 {
        U
    }
    fn owned_by_js(&self) -> bool {
        self.owned_by_js
    }
    fn size(&self) -> usize {
        self.size
    }
    fn set_size(&mut self, size: usize) {
        self.size = size;
    }
    fn replace_externref(&mut self, externref: Resource<JSBuffer>) -> Resource<JSBuffer> {
        mem::replace(&mut self.externref, externref)
    }
}
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
impl<const U: u32> GPUBuffer<U> {
    pub fn new(size: usize, label: String, owned_by_js: bool) -> GPUBuffer<U> {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();

            let externref =
                create_gpu_buffer(size, MULTIVALUE_USIZE.as_ptr(), U, false, owned_by_js);
            return GPUBuffer {
                externref,
                label,
                owned_by_js,
                size,
            };
        }
    }
    fn map_async() -> MappedGPUBuffer<U> {
        todo!("todo");
    }
}
