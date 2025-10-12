use std::num::NonZeroUsize;
use std::ptr;

use externref::{externref, Resource};

use crate::buffer::buffer::{BufferRef, GPUBuffer};
use crate::buffer::mapped_buffer::MappedGPUBuffer;
use crate::device::JSDevice;

#[no_mangle]
#[externref]
pub unsafe extern "C" fn create_mappadle_gpu_buffer_copydst_mapread(
    device: &Resource<JSDevice>,
    length: usize,
    label_ptr: *mut u8,
    label_len: usize,
    label_cap: usize,
) -> *const GPUBuffer<true, false, false, true> {
    let label = String::from_raw_parts(label_ptr, label_len, label_cap);
    Box::into_raw(Box::new(GPUBuffer::new(device, length, label)))
}

#[cfg(not(target_arch = "wasm32"))]
unsafe fn map_read_async(
    _buffer: usize,
    _offset: usize,
    _size: usize,
    _gpubuffer: usize,
    _callback: usize,
) {
}
type MapWriteCallback = *mut *mut dyn FnOnce(MappedGPUBuffer<false, true>);

#[no_mangle]
pub unsafe extern "C" fn buffer_mapped_write(
    buffer: *mut GPUBuffer<false, true>,
    callback: MapWriteCallback,
) {
    Box::from_raw(*Box::from_raw(callback))(MappedGPUBuffer::new(*Box::from_raw(buffer)));
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn map_write_async(
    _buffer: usize,
    _offset: usize,
    _size: usize,
    gpubuffer: usize,
    callback: usize,
) {
    Box::from_raw(*Box::from_raw(callback as MapWriteCallback))(MappedGPUBuffer::new(
        *Box::from_raw(gpubuffer as *mut GPUBuffer<false, true>),
    ));
}
#[cfg(target_arch = "wasm32")]
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
pub unsafe extern "C" fn buffer_mapped_read(
    buffer: *mut GPUBuffer<true>,
    callback: *mut *mut dyn FnOnce(MappedGPUBuffer<true>),
) {
    Box::from_raw(*Box::from_raw(callback))(MappedGPUBuffer::new(*Box::from_raw(buffer)));
}

impl GPUBuffer<true, false, false, true> {
    pub fn map_read_async(
        self,
        offset: usize,
        size: Option<NonZeroUsize>,
        cb: *mut dyn FnOnce(MappedGPUBuffer<true, false, false, true>),
    ) {
        let actual_size = match size {
            Some(size) => size.get(),
            None => self.size - offset,
        };
        unsafe {
            map_read_async(
                ptr::read(&*self.externref as *const BufferRef as *const usize),
                offset,
                actual_size,
                Box::into_raw(Box::new(self)) as usize,
                Box::into_raw(Box::new(cb)) as usize,
            );
        }
    }
}

impl GPUBuffer<false, true, true> {
    pub fn map_write_async(
        self,
        offset: usize,
        size: Option<NonZeroUsize>,
        cb: *mut dyn FnOnce(MappedGPUBuffer<false, true, true>),
    ) {
        let actual_size = match size {
            Some(size) => size.get(),
            None => self.size - offset,
        };
        unsafe {
            map_write_async(
                ptr::read(&*self.externref as *const BufferRef as *const usize),
                offset,
                actual_size,
                Box::into_raw(Box::new(self)) as usize,
                Box::into_raw(Box::new(cb)) as usize,
            );
        }
    }
}
