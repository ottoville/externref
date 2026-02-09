use std::num::NonZeroUsize;
use std::ptr;

use externref::Resource;
use web::primitives::jsstring::{JSString, JSStringExtern};

use crate::buffer::buffer::{BufferRef, GPUBuffer};
use crate::buffer::mapped_buffer::MappedGPUBuffer;

#[cfg(not(target_arch = "wasm32"))]
unsafe fn map_read_async(
    _buffer: usize,
    _offset: usize,
    _size: usize,
    _gpubuffer: usize,
    _callback: MapReadAsyncCB,
) {
}
type MapReadAsyncCB = *mut *mut dyn FnOnce(
    Result<
        MappedGPUBuffer<true, false, false, true>,
        (GPUBuffer<true, false, false, true>, JSString),
    >,
);
type MapWriteCallback = *mut *mut dyn FnOnce(
    Result<MappedGPUBuffer<false, true, true>, (GPUBuffer<false, true, true>, JSString)>,
);

#[no_mangle]
pub unsafe extern "C" fn buffer_mapped_write(
    size: NonZeroUsize,
    offset: usize,
    buffer: *mut GPUBuffer<false, true, true>,
    callback: MapWriteCallback,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Ok(MappedGPUBuffer::new(
        size,
        offset,
        *Box::from_raw(buffer),
    )));
}
#[no_mangle]
pub unsafe extern "C" fn buffer_mapped_write_error(
    buffer: *mut GPUBuffer<false, true, true>,
    callback: MapWriteCallback,
    error: Resource<JSStringExtern>,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Err((
        *Box::from_raw(buffer),
        JSString::new(error),
    )));
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn map_write_async(
    _buffer: usize,
    _offset: usize,
    _size: usize,
    gpubuffer: usize,
    callback: MapWriteCallback,
) {
    Box::from_raw(*Box::from_raw(callback as MapWriteCallback))(Result::Ok(MappedGPUBuffer::new(NonZeroUsize::new(1).unwrap(),1,
        *Box::from_raw(gpubuffer as *mut GPUBuffer<false, true, true>),
    )));
}
#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "buffer")]
extern "C" {
    fn map_write_async(
        buffer: usize,
        offset: usize,
        size: usize,
        gpubuffer: usize,
        callback: MapWriteCallback,
    );
    fn map_read_async(
        buffer: usize,
        offset: usize,
        size: usize,
        gpubuffer: usize,
        callback: MapReadAsyncCB,
    );
}

#[no_mangle]
pub unsafe extern "C" fn buffer_mapped_read(
    size: NonZeroUsize,
    offset: usize,
    buffer: *mut GPUBuffer<true, false, false, true>,
    callback: MapReadAsyncCB,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Ok(MappedGPUBuffer::new(
        size,
        offset,
        *Box::from_raw(buffer),
    )));
}
#[no_mangle]
pub unsafe extern "C" fn buffer_mapped_read_error(
    buffer: *mut GPUBuffer<true, false, false, true>,
    callback: MapReadAsyncCB,
    error: Resource<JSStringExtern>,
) {
    Box::from_raw(*Box::from_raw(callback))(Result::Err((
        *Box::from_raw(buffer),
        JSString::new(error),
    )));
}

impl GPUBuffer<true, false, false, true> {
    pub fn map_read_async(
        self,
        offset: usize,
        size: Option<NonZeroUsize>,
        cb: impl FnOnce(
                Result<
                    MappedGPUBuffer<true, false, false, true>,
                    (GPUBuffer<true, false, false, true>, JSString),
                >,
            ) + 'static,
    ) {
        let actual_size = match size {
            Some(size) => size.get(),
            None => self.size.get() - offset,
        };
        unsafe {
            map_read_async(
                ptr::read(&*self.externref as *const BufferRef as *const usize),
                offset,
                actual_size,
                Box::into_raw(Box::new(self)) as usize,
                Box::into_raw(Box::new(Box::into_raw(Box::new(cb)))),
            );
        }
    }
}

impl GPUBuffer<false, true, true> {
    pub fn map_write_async(
        self,
        offset: usize,
        size: Option<NonZeroUsize>,
        cb: impl FnOnce(
                Result<MappedGPUBuffer<false, true, true>, (GPUBuffer<false, true, true>, JSString)>,
            ) + 'static,
    ) {
        let actual_size = match size {
            Some(size) => size.get(),
            None => self.size.get() - offset,
        };
        unsafe {
            map_write_async(
                ptr::read(&*self.externref as *const BufferRef as *const usize),
                offset,
                actual_size,
                Box::into_raw(Box::new(self)) as usize,
                Box::into_raw(Box::new(Box::into_raw(Box::new(cb)))),
            );
        }
    }
}
