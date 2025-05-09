use std::sync::Arc;

use externref::{externref, Resource};

use super::{
    bindgroup::JSBindGroup,
    buffer::{buffer::JSBuffer, copy_dst::CopyDst},
    command_buffer::{CommandBuffer, JSCommandBuffer},
};

pub struct JSQueue(());

#[cfg(test)]
unsafe fn submit(
    _queue: &Resource<JSQueue>,
    _iterator: *mut &mut (dyn Iterator<Item = Resource<JSCommandBuffer>>),
) {
}
#[cfg(test)]
unsafe fn write_buffer(
    _queue: &Resource<JSQueue>,
    _buffer: &Resource<JSBuffer>,
    _ptr: usize,
    _size: usize,
    _buffer_offset: usize,
) {
}
#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "queue")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn submit(
        queue: &Resource<JSQueue>,
        iterator: *mut &mut (dyn Iterator<Item = Resource<JSCommandBuffer>>),
    );
    pub fn write_buffer(
        queue: &Resource<JSQueue>,
        buffer: &Resource<JSBuffer>,
        ptr: usize,
        size: usize,
        buffer_offset: usize,
    );

}
static mut COMMAND_BUFFER_EXTERNREF: Option<Resource<JSCommandBuffer>> = None;

#[externref]
#[no_mangle]
pub unsafe extern "C" fn drain_command_buffers(
    iterator_ptr: *mut &mut (dyn Iterator<Item = Resource<JSCommandBuffer>>),
) -> Option<&Resource<JSCommandBuffer>> {
    let next = (*iterator_ptr).next();
    if next.is_none() {
        drop(Box::from_raw(iterator_ptr));
    }
    COMMAND_BUFFER_EXTERNREF = next;
    return COMMAND_BUFFER_EXTERNREF.as_ref();
}
pub struct Queue {
    pub externref: Resource<JSQueue>,
}
impl Queue {
    pub fn submit(&self, command_buffers: &mut (dyn Iterator<Item = CommandBuffer>)) {
        // Maintain reference for buffers until submit has been fully executed
        let mut buffers: Vec<Vec<Arc<Resource<JSBuffer>>>> = Vec::new();
        let mut bindgroups: Vec<Vec<Arc<BindGroupResources>>> = Vec::new();
        let mapped = &mut command_buffers.map(|c: CommandBuffer| {
            buffers.push(c.buffers);
            bindgroups.push(c.bindgroups);
            return c.externref;
        }) as &mut (dyn Iterator<Item = Resource<JSCommandBuffer>>);
        let boxed = Box::into_raw(Box::new(mapped));
        unsafe {
            submit(&self.externref, boxed);
        }
    }
    pub fn write_buffer<T: CopyDst>(
        &self,
        buffer: T,
        ptr: usize,
        size: usize,
        buffer_offset: usize,
    ) {
        unsafe {
            write_buffer(
                &self.externref,
                buffer.externref(),
                ptr,
                size,
                buffer_offset,
            )
        }
    }
}
