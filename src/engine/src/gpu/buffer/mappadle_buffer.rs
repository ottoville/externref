use crate::gpu::buffer::usages::{MAP_READ_COPYDST_USAGE, MAP_READ_USAGE};
use std::num::NonZeroUsize;
use std::ptr;
use std::sync::{Arc, Weak};
use std::{ops::Deref, sync::Mutex};

use crate::gpu::gpu::create_gpu_buffer;
use crate::{gpu::bufferbinding::BufferBinding, MULTIVALUE_USIZE};

use super::{
    buffer::{GPUBuffer, GpuBuffer, JSBuffer},
    mapped_buffer::MappedGPUBuffer,
};
use crate::gpu::buffer::usages::MAP_WRITE_COPYSRC_USAGE;
use crate::gpu::gpu::JSDevice;
use externref::Resource;

#[cfg(test)]
unsafe fn map_write_async(
    _buffer: usize,
    _offset: usize,
    _size: usize,
    gpubuffer: *mut MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>,
    callback: *mut fn(MappedGPUBuffer<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>),
) {
    Box::from_raw(callback)(MappedGPUBuffer::new(*Box::from_raw(gpubuffer)));
}
#[cfg(test)]
unsafe fn map_read_async(
    _buffer: usize,
    _offset: usize,
    _size: usize,
    _gpubuffer: *mut MappadleGPUBuffer<MAP_READ_COPYDST_USAGE>,
    _callback: *mut *mut dyn FnOnce(MappedGPUBuffer<MappadleGPUBuffer<MAP_READ_COPYDST_USAGE>>),
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
        gpubuffer: *mut MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>,
        callback: *mut fn(MappedGPUBuffer<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>),
    );
    fn map_read_async(
        buffer: usize,
        offset: usize,
        size: usize,
        gpubuffer: *mut MappadleGPUBuffer<MAP_READ_COPYDST_USAGE>,
        callback: *mut *mut dyn FnOnce(MappedGPUBuffer<MappadleGPUBuffer<MAP_READ_COPYDST_USAGE>>),
    );
}
#[no_mangle]
pub unsafe extern "C" fn buffer_mapped_write(
    buffer: *mut MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>,
    callback: *mut fn(MappedGPUBuffer<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>),
) {
    Box::from_raw(callback)(MappedGPUBuffer::new(*Box::from_raw(buffer)));
}
#[no_mangle]
pub unsafe extern "C" fn buffer_mapped_read(
    buffer: *mut MappadleGPUBuffer<MAP_READ_USAGE>,
    callback: *mut *mut dyn FnOnce(MappedGPUBuffer<MappadleGPUBuffer<MAP_READ_USAGE>>),
) {
    Box::from_raw(*Box::from_raw(callback))(MappedGPUBuffer::new(*Box::from_raw(buffer)));
}
pub struct MappadleGPUBuffer<const U: u32>(GPUBuffer<U>);
impl MappadleGPUBuffer<MAP_READ_COPYDST_USAGE> {
    pub fn map_read_async(
        self,
        offset: usize,
        size: Option<NonZeroUsize>,
        cb: *mut dyn FnOnce(MappedGPUBuffer<Self>),
    ) {
        let actual_size = match size {
            Some(size) => size.get(),
            None => self.0.size - offset,
        };
        unsafe {
            map_read_async(
                ptr::read(&*self.0.externref as *const Resource<JSBuffer> as *const usize),
                offset,
                actual_size,
                Box::into_raw(Box::new(self)),
                Box::into_raw(Box::new(cb)),
            );
        }
    }
}
impl MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE> {
    pub fn map_write_async(
        self,
        offset: usize,
        size: Option<NonZeroUsize>,
        cb: fn(MappedGPUBuffer<Self>),
    ) {
        let actual_size = match size {
            Some(size) => size.get(),
            None => self.0.size - offset,
        };
        unsafe {
            map_write_async(
                ptr::read(&*self.0.externref as *const Resource<JSBuffer> as *const usize),
                offset,
                actual_size,
                Box::into_raw(Box::new(self)),
                Box::into_raw(Box::new(cb)),
            );
        }
    }
}
impl<const U: u32> MappadleGPUBuffer<U> {
    pub fn new_mapped(
        device: &Resource<JSDevice>,
        size: usize,
        label: String,
        owned_by_js: bool,
    ) -> MappedGPUBuffer<MappadleGPUBuffer<U>> {
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
                externref: Arc::new(externref),
                label,
                owned_by_js,
                size,
                buffer_bindings: Vec::new(),
            }));
        }
    }
    pub fn new(device: &Resource<JSDevice>, size: usize, label: String) -> MappadleGPUBuffer<U> {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();
            let externref =
                create_gpu_buffer(device, size, MULTIVALUE_USIZE.as_ptr(), U, false, false);
            return MappadleGPUBuffer(GPUBuffer {
                externref: Arc::new(externref),
                label,
                owned_by_js: false,
                size,
                buffer_bindings: Vec::new(),
            });
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
        self.0.set_size(size);
    }
    fn replace_externref(&mut self, externref: Arc<Resource<JSBuffer>>) -> Arc<Resource<JSBuffer>> {
        self.0.replace_externref(externref)
    }
    fn add_buffer_binding(&mut self, bind_group: Weak<Mutex<BufferBinding>>) {
        self.0.add_buffer_binding(bind_group);
    }

    fn externref_arc(&self) -> Arc<Resource<JSBuffer>> {
        self.0.externref_arc()
    }

    fn take_externref(self) -> Arc<Resource<JSBuffer>> {
        self.0.take_externref()
    }
}
impl<const U: u32> Deref for MappadleGPUBuffer<U> {
    type Target = GPUBuffer<U>;
    fn deref(&self) -> &GPUBuffer<U> {
        &self.0
    }
}
