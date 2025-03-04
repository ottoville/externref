use std::ptr;

use externref::{externref, Resource};

use super::{
    bindgroup::{BindGroup, JSBindGroup},
    gpu::JSDevice,
};

#[cfg(test)]
unsafe fn set_bindgroup(_resource: usize, _index: u32, _bindgroup: &Resource<JSBindGroup>) {}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "bindcommands")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn set_bindgroup(
        resource: usize,
        index: u32,
        bindgroup: &Resource<JSBindGroup>,
    );
}
pub trait BindingCommands<T> {
    fn externref(&self) -> &Resource<T>;
    fn after_set_bindgroup(&mut self, bindgroup: &mut BindGroup);
    fn set_bindgroup(
        &mut self,
        device: &Resource<JSDevice>,
        index: u32,
        bindgroup: &mut BindGroup,
    ) {
        let externref = self.externref();
        let ptr = unsafe {
            ptr::read(externref as *const Resource<T> as *const usize)
        };
        unsafe { set_bindgroup(ptr, index, bindgroup.get_bind_group(device)) };
        self.after_set_bindgroup(bindgroup);
    }
}
