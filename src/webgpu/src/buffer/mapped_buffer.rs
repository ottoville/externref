use std::cell::RefCell;
use std::num::NonZeroUsize;
use std::ops::Deref;
use std::rc::Rc;

use externref::{externref, Resource};
use web::primitives::jsstring::{JSString, JSStringExtern};

use crate::buffer::buffer::{GPUBuffer, JSBuffer};
use crate::device::JSDevice;
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn set_mapped_range(
    _buffer: &Resource<JSBuffer>,
    _offset: usize,
    _size: usize,
    _buffer_offset: usize,
) {
}
#[cfg(not(target_arch = "wasm32"))]
unsafe fn get_mapped_range(
    _buffer: &Resource<JSBuffer>,
    _offset: usize,
    _size: NonZeroUsize,
    _buffer_offset: usize,
) {
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn unmap(_buffer: &Resource<JSBuffer>) {}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "buffer")]
extern "C" {
    pub fn get_mapped_range(
        buffer: &Resource<JSBuffer>,
        offset: usize,
        size: NonZeroUsize,
        buffer_offset: usize,
    );
    pub fn set_mapped_range(
        buffer: &Resource<JSBuffer>,
        offset: usize,
        size: usize,
        buffer_offset: usize,
    );
    pub fn unmap(buffer: &Resource<JSBuffer>);
}

pub struct MappedGPUBuffer<
    const MAP_READ: bool,
    const MAP_WRITE: bool = false,
    const COPY_SRC: bool = false,
    const COPY_DST: bool = false,
    const INDEX: bool = false,
    const VERTEX: bool = false,
    const UNIFORM: bool = false,
    const STORAGE: bool = false,
    const INDIRECT: bool = false,
    const QUERY_RESOLVE: bool = false,
> {
    size: NonZeroUsize,
    offset: usize,
    buffer: GPUBuffer<
        MAP_READ,
        MAP_WRITE,
        COPY_SRC,
        COPY_DST,
        INDEX,
        VERTEX,
        UNIFORM,
        STORAGE,
        INDIRECT,
        QUERY_RESOLVE,
    >,
}

#[no_mangle]
#[externref]
pub unsafe extern "C" fn create_mapped_gpu_buffer_copysrc(
    device: &Resource<JSDevice>,
    size: NonZeroUsize,
    label: Resource<JSStringExtern>,
) -> *const MappedGPUBuffer<false, false, true> {
    Box::into_raw(Box::new(GPUBuffer::new_mapped(
        device,
        size,
        JSString::new(label).into(),
    )))
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn create_buffer_uniform_copydst(
    device: &Resource<JSDevice>,
    size: NonZeroUsize,
    x: f32,
    y: f32,
) -> *const Rc<RefCell<GPUBuffer<false, false, false, true, false, false, true>>> {
    let label = String::from("UI_transform");
    let buffer = GPUBuffer::new_mapped(device, size, label);
    let data = [x, y];
    buffer.set_mapped_range(&data, 0);
    Box::into_raw(Box::new(Rc::new(RefCell::new(buffer.unmap()))))
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn create_mappadle_gpu_buffer_copydst_mapread(
    device: &Resource<JSDevice>,
    size: NonZeroUsize,
    label: Resource<JSStringExtern>,
) -> *const GPUBuffer<true, false, false, true> {
    Box::into_raw(Box::new(GPUBuffer::new(
        device,
        size,
        JSString::new(label).into(),
    )))
}
#[no_mangle]
#[externref]
pub unsafe extern "C" fn create_copysrc_storage_copydst_buffer(
    device: &Resource<JSDevice>,
    size: NonZeroUsize,
) -> *const GPUBuffer<false, false, true, true, false, false, false, true> {
    Box::into_raw(Box::new(GPUBuffer::new(
        device,
        size,
        String::from("facet12ArrGPUBuffer"),
    )))
}
impl<
        const MAP_READ: bool,
        const MAP_WRITE: bool,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const INDEX: bool,
        const VERTEX: bool,
        const UNIFORM: bool,
        const STORAGE: bool,
        const INDIRECT: bool,
        const QUERY_RESOLVE: bool,
    >
    MappedGPUBuffer<
        MAP_READ,
        MAP_WRITE,
        COPY_SRC,
        COPY_DST,
        INDEX,
        VERTEX,
        UNIFORM,
        STORAGE,
        INDIRECT,
        QUERY_RESOLVE,
    >
{
    pub fn new(
        size: NonZeroUsize,
        offset: usize,
        buffer: GPUBuffer<
            MAP_READ,
            MAP_WRITE,
            COPY_SRC,
            COPY_DST,
            INDEX,
            VERTEX,
            UNIFORM,
            STORAGE,
            INDIRECT,
            QUERY_RESOLVE,
        >,
    ) -> Self {
        MappedGPUBuffer {
            size,
            offset,
            buffer,
        }
    }
    pub fn get_mapped_range_raw<T>(&self, ptr: *mut T, size: NonZeroUsize, buffer_offset: usize) {
        unsafe {
            get_mapped_range(&self.buffer.externref.0, ptr as usize, size, buffer_offset);
        }
    }
    pub fn get_mapped_range_vec<T>(&self, data: &mut Vec<T>, buffer_offset: usize) {
        data.clear();
        let new_size = self.size.get() / size_of::<T>();
        let _ = data.try_reserve_exact(new_size);
        unsafe {
            data.set_len(new_size);
            get_mapped_range(
                &self.buffer.externref.0,
                data.as_ptr() as usize,
                self.size,
                buffer_offset,
            );
        }
    }
    pub fn get_mapped_range<T>(&self, data: &mut T, buffer_offset: usize) {
        unsafe {
            get_mapped_range(
                &self.buffer.externref.0,
                data as *const T as usize,
                NonZeroUsize::new_unchecked(size_of::<T>()),
                buffer_offset,
            );
        }
    }
    pub fn set_mapped_range_raw<T>(&self, data: &[T], buffer_offset: usize) {
        unsafe {
            set_mapped_range(
                &self.buffer.externref.0,
                data.as_ptr() as usize,
                data.len() * size_of::<T>(),
                buffer_offset,
            );
        }
    }
    pub fn set_mapped_range<T>(&self, data: &T, buffer_offset: usize) {
        unsafe {
            set_mapped_range(
                &self.buffer.externref.0,
                data as *const T as usize,
                size_of::<T>(),
                buffer_offset,
            );
        }
    }
    pub fn unmap(
        self,
    ) -> GPUBuffer<
        MAP_READ,
        MAP_WRITE,
        COPY_SRC,
        COPY_DST,
        INDEX,
        VERTEX,
        UNIFORM,
        STORAGE,
        INDIRECT,
        QUERY_RESOLVE,
    > {
        unsafe {
            unmap(&self.buffer.externref.0);
        }
        self.buffer
    }
}

impl<
        const MAP_READ: bool,
        const MAP_WRITE: bool,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const INDEX: bool,
        const VERTEX: bool,
        const UNIFORM: bool,
        const STORAGE: bool,
        const INDIRECT: bool,
        const QUERY_RESOLVE: bool,
    > Deref
    for MappedGPUBuffer<
        MAP_READ,
        MAP_WRITE,
        COPY_SRC,
        COPY_DST,
        INDEX,
        VERTEX,
        UNIFORM,
        STORAGE,
        INDIRECT,
        QUERY_RESOLVE,
    >
{
    type Target = GPUBuffer<
        MAP_READ,
        MAP_WRITE,
        COPY_SRC,
        COPY_DST,
        INDEX,
        VERTEX,
        UNIFORM,
        STORAGE,
        INDIRECT,
        QUERY_RESOLVE,
    >;
    fn deref(&self) -> &Self::Target {
        &self.buffer
    }
}
