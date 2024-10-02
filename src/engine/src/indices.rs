use crate::{engine::JSBuffer, MULTIVALUE_USIZE};
use externref::{externref, Resource};

#[externref]
#[no_mangle]
pub unsafe extern "C" fn set_indices_gpu_buffer(
    indices_ptr: *mut Indices,
    buffer: Resource<JSBuffer>,
) {
    let indices = &mut (*indices_ptr);
    indices.gpu_buffer = Some(buffer);
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn get_indices_gpu_buffer<'frame>(
    indices_ptr: *mut Indices,
) -> Option<&'frame Resource<JSBuffer>> {
    let indices = &mut (*indices_ptr);
    indices.gpu_buffer.as_ref()
}
#[externref]
#[no_mangle]
pub unsafe extern "C" fn get_indices_pointer<'frame>(
    indices_ptr: *mut Indices,
) -> *const usize {
    let indices = &mut (*indices_ptr);
    MULTIVALUE_USIZE[0] = indices.indices.as_ptr() as usize;
    MULTIVALUE_USIZE[1] = indices.indices.len();
    MULTIVALUE_USIZE[2] = indices.indices.capacity();
    MULTIVALUE_USIZE.as_ptr()
}
pub struct Indices {
    pub indices: Vec<usize>,
    pub gpu_buffer: Option<Resource<JSBuffer>>,
}
