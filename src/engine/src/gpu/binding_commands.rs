use std::{ptr, sync::Arc};

use externref::{externref, Resource};

use crate::gpu::externref_trait::HaveExternref;

use super::{
    bindgroup::{BindGroup, BindGroupResources, JSBindGroup},
    gpu::JSDevice,
};

#[cfg(test)]
pub unsafe fn set_bindgroup(
    _resource: usize,
    _index: u32,
    _bindgroup: &Resource<JSBindGroup>,
    _dynamic_offsets_data_start: *const u32,
    _dynamic_offsets_data_length: usize,
) {
}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "bindcommands")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn set_bindgroup(
        resource: usize,
        index: u32,
        bindgroup: &Resource<JSBindGroup>,
        dynamic_offsets_data_start: *const u32,
        dynamic_offsets_data_length: usize,
    );
}
pub trait BindingCommands<T>: HaveExternref<T> {
    fn after_set_bindgroup(&mut self, bindgroup: &BindGroup);
    // Hold references to prevent buffer being CG't before command encoder has been executed
    fn bindgroups(&mut self) -> &mut Vec<Arc<BindGroupResources>>;
    fn set_bindgroup(
        &mut self,
        device: &Resource<JSDevice>,
        index: u32,
        bindgroup: &BindGroup,
        dynamic_offsets: &[u32],
    ) {
        let externref = self.externref();
        let ptr = unsafe { ptr::read(externref as *const Resource<T> as *const usize) };
        let extenref_resources = bindgroup.get_bindgroup(device);
        unsafe {
            set_bindgroup(
                ptr,
                index,
                &extenref_resources.externref,
                dynamic_offsets.as_ptr(),
                dynamic_offsets.len(),
            )
        };
        self.bindgroups().push(extenref_resources);

        self.after_set_bindgroup(bindgroup);
    }
}
