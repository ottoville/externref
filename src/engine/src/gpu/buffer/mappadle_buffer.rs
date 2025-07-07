use crate::gpu::buffer::usages::{MAP_READ_COPYDST_USAGE, MAP_READ_USAGE, MAP_WRITE_USAGE};
use std::num::NonZeroUsize;
use std::ptr;

use super::{
    buffer::{GPUBuffer, GpuBuffer, JSBuffer},
    mapped_buffer::MappedGPUBuffer,
};
use crate::gpu::buffer::usages::MAP_WRITE_COPYSRC_USAGE;
use crate::mesh::ENGINE;
use externref::Resource;

#[no_mangle]
#[cfg(feature = "webgpu")]
pub unsafe extern "C" fn create_mappadle_GPU_buffer_copydst_mapread(
    length: usize,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> *const GPUBuffer<MAP_READ_COPYDST_USAGE> {
    let gpuopt = ENGINE.gpu.lock().unwrap();
    let gpu = gpuopt.as_ref().unwrap();
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    Box::into_raw(Box::new(GPUBuffer::new(&gpu.device, length, label, false)))
}

#[cfg(test)]
unsafe fn map_write_async(
    _buffer: usize,
    _offset: usize,
    _size: usize,
    gpubuffer: usize,
    callback: usize,
) {
    Box::from_raw(callback as *mut fn(MappedGPUBuffer<GPUBuffer<MAP_WRITE_USAGE>>))(
        MappedGPUBuffer::new(*Box::from_raw(
            gpubuffer as *mut GPUBuffer<MAP_WRITE_USAGE>,
        )),
    );
}
#[cfg(test)]
unsafe fn map_read_async(
    _buffer: usize,
    _offset: usize,
    _size: usize,
    _gpubuffer: usize,
    _callback: usize,
) {
}
#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[link(wasm_import_module = "buffer")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn map_write_async(
        buffer: usize,
        offset: usize,
        size: usize,
        gpubuffer: usize,
        callback: usize,
    );
    fn map_read_async(buffer: usize, offset: usize, size: usize, gpubuffer: usize, callback: usize);
}
#[no_mangle]
pub unsafe extern "C" fn buffer_mapped_write(
    buffer: *mut GPUBuffer<MAP_WRITE_USAGE>,
    callback: *mut fn(MappedGPUBuffer<GPUBuffer<MAP_WRITE_USAGE>>),
) {
    Box::from_raw(callback)(MappedGPUBuffer::new(*Box::from_raw(buffer)));
}
#[no_mangle]
pub unsafe extern "C" fn buffer_mapped_read(
    buffer: *mut GPUBuffer<MAP_READ_USAGE>,
    callback: *mut *mut dyn FnOnce(MappedGPUBuffer<GPUBuffer<MAP_READ_USAGE>>),
) {
    Box::from_raw(*Box::from_raw(callback))(MappedGPUBuffer::new(*Box::from_raw(buffer)));
}
pub trait MappadleGPUBufferWrite: GpuBuffer {
    fn map_write_async(
        self,
        offset: usize,
        size: Option<NonZeroUsize>,
        cb: fn(MappedGPUBuffer<Self>),
    ) where
        Self: Sized,
    {
        let actual_size = match size {
            Some(size) => size.get(),
            None => self.size() - offset,
        };
        unsafe {
            map_write_async(
                ptr::read(&*self.externref() as *const Resource<JSBuffer> as *const usize),
                offset,
                actual_size,
                Box::into_raw(Box::new(self)) as usize,
                Box::into_raw(Box::new(cb)) as usize,
            );
        }
    }
}
pub trait MappadleGPUBufferRead: GpuBuffer {
    fn map_read_async(
        self,
        offset: usize,
        size: Option<NonZeroUsize>,
        cb: *mut dyn FnOnce(MappedGPUBuffer<Self>),
    ) where
        Self: Sized,
    {
        let actual_size = match size {
            Some(size) => size.get(),
            None => self.size() - offset,
        };
        unsafe {
            map_read_async(
                ptr::read(&*self.externref() as *const Resource<JSBuffer> as *const usize),
                offset,
                actual_size,
                Box::into_raw(Box::new(self)) as usize,
                Box::into_raw(Box::new(cb)) as usize,
            );
        }
    }
}
impl MappadleGPUBufferRead for GPUBuffer<MAP_READ_COPYDST_USAGE> {}
impl MappadleGPUBufferWrite for GPUBuffer<MAP_WRITE_COPYSRC_USAGE> {}
