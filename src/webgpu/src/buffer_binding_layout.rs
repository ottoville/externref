use crate::{
    binding_layout::{BindingLayout, JSGPUBindGroupLayoutEntry},
    sampler::sampler::create_bind_group_layout_entry_sampler,
    texture::texture::TextureViewDimension,
};
use externref::Resource;

pub enum BufferBindingType {
    Uniform,
    Storage,
    ReadOnlyStorage,
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_bind_group_layout_entry_buffer(
    _binding: u32,
    _visibility: u32,
    _bindingtype: BufferBindingType,
    _has_dynamic_offset: bool,
    _min_binding_size: u32,
) -> Resource<JSGPUBindGroupLayoutEntry> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_bind_group_layout_entry_texture(
    _binding: u32,
    _visibility: u32,
    _sample_type: u32,
    _view_dimension: TextureViewDimension,
    _multisampled: bool,
) -> Resource<JSGPUBindGroupLayoutEntry> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "device")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_bind_group_layout_entry_buffer(
        binding: u32,
        visibility: u32,
        bindingtype: BufferBindingType,
        has_dynamic_offset: bool,
        min_binding_size: u32,
    ) -> Resource<JSGPUBindGroupLayoutEntry>;
    pub fn create_bind_group_layout_entry_texture(
        binding: u32,
        visibility: u32,
        sample_type: u32,
        view_dimension: TextureViewDimension,
        multisampled: bool,
    ) -> Resource<JSGPUBindGroupLayoutEntry>;
}
#[no_mangle]
pub unsafe extern "C" fn iterate_binding_layouts(
    iterator: *mut std::slice::Iter<'_, &dyn BindingLayout>,
) -> isize {
    use std::ptr;
    let maybebinding = (*iterator).next();
    match maybebinding {
        Some(layout) => {
            let externref = ptr::read(layout.externref()
                as *const Resource<JSGPUBindGroupLayoutEntry>
                as *const usize);

            return externref as isize;
        }
        None => {
            drop(Box::from_raw(iterator));
            return -1;
        }
    }
}

impl<const VISIBILITY: u32> GPUBindingLayout<VISIBILITY> {
    pub fn new_buffer(
        binding: u32,
        bindingtype: BufferBindingType,
        has_dynamic_offset: bool,
        min_binding_size: u32,
    ) -> Self {
        let externref = unsafe {
            create_bind_group_layout_entry_buffer(
                binding,
                VISIBILITY,
                bindingtype,
                has_dynamic_offset,
                min_binding_size,
            )
        };
        GPUBindingLayout { binding, externref }
    }
    pub fn new_texture(
        binding: u32,
        sample_type: u32,
        view_dimension: TextureViewDimension,
        multisampled: bool,
    ) -> Self {
        let externref = unsafe {
            create_bind_group_layout_entry_texture(
                binding,
                VISIBILITY,
                sample_type,
                view_dimension,
                multisampled,
            )
        };
        GPUBindingLayout { binding, externref }
    }
    pub fn new_sampler(binding: u32, binding_type: u32) -> Self {
        let externref =
            unsafe { create_bind_group_layout_entry_sampler(binding, VISIBILITY, binding_type) };
        GPUBindingLayout { binding, externref }
    }
}
pub struct GPUBindingLayout<const VISIBILITY: u32> {
    binding: u32,
    externref: Resource<JSGPUBindGroupLayoutEntry>,
}

impl<const VISIBILITY: u32> BindingLayout for GPUBindingLayout<VISIBILITY> {
    fn externref(&self) -> &Resource<JSGPUBindGroupLayoutEntry> {
        &self.externref
    }
}
