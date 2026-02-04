use std::ptr;
use std::rc::Rc;

use crate::device::JSDevice;
use externref::Resource;

use crate::{
    bindgroup::{
        bindgroup::{BindGroup, JSBindGroup},
        bindgroup_resources::BindGroupResources,
    },
    externref_trait::HaveExternref,
};

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn set_bindgroup(
    _resource: usize,
    _index: u32,
    _bindgroup: &Resource<JSBindGroup>,
    _dynamic_offsets_data_start: *const u32,
    _dynamic_offsets_data_length: usize,
) {
}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "bindcommands")]
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
    fn after_set_bindgroup<const N: usize>(&mut self, bindgroup: &BindGroup<N>);
    // Hold references to prevent buffer being CG't before command encoder has been executed
    fn bindgroups(&mut self) -> &mut Vec<Rc<BindGroupResources>>;
    fn set_bindgroup<const N: usize>(
        &mut self,
        device: &Resource<JSDevice>,
        index: u32,
        bindgroup: &BindGroup<N>,
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
