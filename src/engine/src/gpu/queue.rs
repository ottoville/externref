use externref::{externref, Resource};

use super::command_encoder::JSCommandBuffer;
pub struct JSQueue(());

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
    pub fn submit(&self, command_buffers: &mut (dyn Iterator<Item = Resource<JSCommandBuffer>>)) {
        #[cfg(feature = "webgpu")]
        unsafe {
            submit(&self.externref, Box::into_raw(Box::new(command_buffers)));
        }
    }
}
