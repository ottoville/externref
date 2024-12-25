use std::sync::Arc;

use externref::{externref, Resource};

use super::{
    buffer::buffer::JSBuffer,
    command_buffer::{CommandBuffer, JSCommandBuffer},
};

pub struct JSQueue(());

#[cfg(test)]
unsafe fn submit(
    _queue: &Resource<JSQueue>,
    _iterator: *mut &mut (dyn Iterator<Item = Resource<JSCommandBuffer>>),
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
        let mapped = &mut command_buffers.map(|c: CommandBuffer| {
            buffers.push(c.buffers);
            return c.externref;
        }) as &mut (dyn Iterator<Item = Resource<JSCommandBuffer>>);
        let boxed = Box::into_raw(Box::new(mapped));
        unsafe {
            submit(&self.externref, boxed);
        }
    }
}
