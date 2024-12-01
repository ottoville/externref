use std::{mem, ops::Deref};

use externref::Resource;
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
use super::buffer::map_write_async;
use super::{buffer::{GPUBuffer, GpuBuffer, JSBuffer}, pending_buffer::PendingGPUBuffer};

pub struct MappadleGPUBuffer<const U: u32>(GPUBuffer<U>);
impl<const U: u32> MappadleGPUBuffer<U>{
    pub fn map_write_async(self, offset: usize, size: usize) -> PendingGPUBuffer<U> {
        #[cfg(feature = "webgpu")]
        #[cfg(any(not(test), rust_analyzer))]
        unsafe {
            map_write_async(&self.0.externref, offset, size);
        }
        PendingGPUBuffer::new(self)
    }
    pub fn new(b: GPUBuffer<U>) -> MappadleGPUBuffer<U> {
        return MappadleGPUBuffer(b);
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
        mem::replace(&mut self.0.externref, externref)
    }
}
impl<const U: u32> Deref for MappadleGPUBuffer<U> {
    type Target = GPUBuffer<U>;
    fn deref(&self) -> &GPUBuffer<U> {
        &self.0
    }
}