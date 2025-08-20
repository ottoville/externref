use std::{cell::RefCell, sync::Arc};

#[cfg(any(not(test), rust_analyzer))]
#[cfg(target_arch = "wasm32")]
use externref::externref;
use externref::Resource;

use crate::gpu::{gpu::{create_bind_group_layout, JSDevice}, texture::texture::TextureViewDimension};

thread_local! {
    static LABEL:RefCell<[usize; 3]> = const { RefCell::new([0;3]) };
}
pub enum BufferBindingType {
    Uniform,
    Storage,
    ReadOnlyStorage,
}
#[cfg(test)]
pub unsafe fn create_bind_group_layout_entry_buffer(
    _binding: u32,
    _visibility: u32,
    _bindingtype: BufferBindingType,
    _has_dynamic_offset: bool,
    _min_binding_size: u32,
) -> Resource<JSGPUBindGroupLayoutEntry> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(test)]
pub fn create_bind_group_layout_entry_texture(
    _binding: u32,
    _visibility: u32,
    _sample_type: u32,
    _view_dimension: TextureViewDimension,
    _multisampled: bool,
) -> Resource<JSGPUBindGroupLayoutEntry> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(target_arch = "wasm32")]
#[externref]
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

pub struct JSBindGroupLayout(());
pub struct JSGPUBindGroupLayoutEntry(());

pub struct BindGroupLayout<const N: usize> {
    label: String,
    pub externref: Arc<Resource<JSBindGroupLayout>>,
}

pub trait BindingLayout {
    fn externref(&self) -> &Resource<JSGPUBindGroupLayoutEntry>;
}
impl<const VISIBILITY: u32> GPUBufferBindingLayout<VISIBILITY> {
    pub fn new(
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
        GPUBufferBindingLayout { binding, externref }
    }
}
impl<const VISIBILITY: u32> GPUTextureBindingLayout<VISIBILITY> {
    pub fn new(
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
        GPUTextureBindingLayout { binding, externref }
    }
}
pub struct GPUBufferBindingLayout<const VISIBILITY: u32> {
    binding: u32,
    externref: Resource<JSGPUBindGroupLayoutEntry>,
}

impl<const VISIBILITY: u32> BindingLayout for GPUBufferBindingLayout<VISIBILITY> {
    fn externref(&self) -> &Resource<JSGPUBindGroupLayoutEntry> {
        &self.externref
    }
}

pub struct GPUSamplerBindingLayout {}
pub struct GPUTextureBindingLayout<const VISIBILITY: u32> {
    binding: u32,
    externref: Resource<JSGPUBindGroupLayoutEntry>,
}
pub struct GPUStorageTextureBindingLayout {}
pub struct GPUExternalTextureBindingLayout {}

impl<const N: usize> BindGroupLayout<N> {
    pub fn new(
        device: &Resource<JSDevice>,
        label: String,
        entries: [&dyn BindingLayout; N],
    ) -> Self {
        let bindinglayout_iterator = Box::new(entries.iter());
        let label_ptr = LABEL.with_borrow_mut(|l| {
            l[0] = label.as_ptr() as usize;
            l[1] = label.len();
            l[2] = label.capacity();
            l.as_ptr()
        });
        let externref = unsafe {
            create_bind_group_layout(device, label_ptr, Box::into_raw(bindinglayout_iterator))
        };
        BindGroupLayout {
            label,
            externref: Arc::new(externref),
        }
    }
}
