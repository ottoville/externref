use std::mem;

use externref::{externref, Resource};

use crate::{gpu::command_encoder::JSCommandEncoder, MULTIVALUE_USIZE};

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
        command_encoder: &Resource<JSCommandEncoder>,
        destination: &Resource<JSBuffer>,
        source: &Resource<JSBuffer>,
        sourceOffset: usize,
        destinationOffset: usize,
        copySize: usize,
    );
    pub fn unmap(buffer: &Resource<JSBuffer>);
    pub fn write(buffer: &Resource<JSBuffer>, ptr: usize, size: usize, buffer_offset: usize);
    pub fn map_write_async(buffer: &Resource<JSBuffer>, offset: usize, size: usize);
    /**
     * 0: unmapped, 1: pending: 2: mapped;
     */
    pub fn map_state(buffer: &Resource<JSBuffer>) -> u32;
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
    pub owned_by_js: bool,
    pub size: usize,
}
//////////////////////////////
pub trait GpuBuffer {
    fn externref(&self) -> &Resource<JSBuffer>;
    fn label(&self) -> &String;
    fn owned_by_js(&self) -> bool;
    fn usages(&self) -> u32;
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
        self.size = size;
    }
    fn replace_externref(&mut self, externref: Resource<JSBuffer>) -> Resource<JSBuffer> {
        mem::replace(&mut self.externref, externref)
    }
}

impl<const U: u32> GPUBuffer<U> {
    #[cfg(feature = "webgpu")]
    #[cfg(any(not(test), rust_analyzer))]
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
    #[cfg(test)]
    pub fn new(size: usize, label: String, owned_by_js: bool) -> GPUBuffer<U> {
        use externref::ExternRef;
        unsafe {
            return GPUBuffer {
                externref: Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                label,
                owned_by_js,
                size,
            };
        }
    }
}
