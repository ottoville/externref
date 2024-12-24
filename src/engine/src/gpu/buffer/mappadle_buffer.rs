use std::{ops::Deref, rc::Weak, sync::Mutex};

use crate::{gpu::bufferbinding::BufferBinding, MULTIVALUE_USIZE};

use super::buffer::map_write_async;
use super::{
    buffer::{GPUBuffer, GpuBuffer, JSBuffer},
    mapped_buffer::MappedGPUBuffer,
    pending_buffer::PendingGPUBuffer,
};
use crate::gpu::gpu::JSDevice;
use externref::Resource;

pub struct MappadleGPUBuffer<const U: u32>(GPUBuffer<U>);
impl<const U: u32> MappadleGPUBuffer<U> {
    pub fn map_write_async(self, offset: usize, size: usize) -> PendingGPUBuffer<U> {
        unsafe {
            map_write_async(&self.0.externref, offset, size);
        }
        PendingGPUBuffer::new(self)
    }
    #[cfg(feature = "webgpu")]
    #[cfg(any(not(test), rust_analyzer))]
    pub fn new_mapped(
        device: &Resource<JSDevice>,
        size: usize,
        label: String,
        owned_by_js: bool,
    ) -> MappedGPUBuffer<MappadleGPUBuffer<U>> {
        use crate::gpu::gpu::create_gpu_buffer;

        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();
            let externref = create_gpu_buffer(
                device,
                size,
                MULTIVALUE_USIZE.as_ptr(),
                U,
                true,
                owned_by_js,
            );
            return MappedGPUBuffer::new(MappadleGPUBuffer(GPUBuffer {
                externref,
                label,
                owned_by_js,
                size,
                buffer_bindings: Vec::new(),
            }));
        }
    }
    #[cfg(test)]
    pub fn new_mapped(
        _device: &Resource<JSDevice>,
        size: usize,
        label: String,
        owned_by_js: bool,
    ) -> MappedGPUBuffer<MappadleGPUBuffer<U>> {
        use externref::ExternRef;
        unsafe {
            return MappedGPUBuffer::new(MappadleGPUBuffer(GPUBuffer {
                externref: Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                label,
                owned_by_js,
                size,
                buffer_bindings: Vec::new(),
            }));
        }
    }
}
impl<const U: u32> GpuBuffer for MappadleGPUBuffer<U> {
    fn externref(&self) -> &Resource<JSBuffer> {
        &self.0.externref
    }
    fn label(&self) -> &String {
        &self.0.label
    }
    fn owned_by_js(&self) -> bool {
        self.0.owned_by_js
    }
    fn usages(&self) -> u32 {
        U
    }
    fn size(&self) -> usize {
        self.0.size
    }
    fn set_size(&mut self, size: usize) {
        self.0.size = size;
    }
    fn replace_externref(&mut self, externref: Resource<JSBuffer>) -> Resource<JSBuffer> {
        self.0.replace_externref(externref)
    }
    fn add_buffer_binding(&mut self, bind_group: Weak<Mutex<BufferBinding>>) {
        self.0.add_buffer_binding(bind_group);
    }
}
impl<const U: u32> Deref for MappadleGPUBuffer<U> {
    type Target = GPUBuffer<U>;
    fn deref(&self) -> &GPUBuffer<U> {
        &self.0
    }
}
