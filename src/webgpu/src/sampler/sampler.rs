use crate::bindgroup::bindgroup_descriptor::push_to_bind_group_descriptor;
use crate::{
    bindgroup::{bindgroup_descriptor::JSBindGroupDescriptor, bindgroup_entry::BindGroupBinding},
    binding_layout::JSGPUBindGroupLayoutEntry,
    device::JSDevice,
};
use externref::Resource;
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_sampler(
    _device: &Resource<JSDevice>,
    _label_ptr: usize,
    _label_len: usize,
    _addressModeU: GPUAddressMode,
    _addressModeV: GPUAddressMode,
    _addressModeW: GPUAddressMode,
    _magFilter: GPUFilterMode,
    _minFilter: GPUFilterMode,
    _mipmapFilter: GPUFilterMode,
    _lodMinClamp: f32,
    _lodMaxClamp: f32,
    _maxAnisotropy: u16,
) -> Resource<JSSampler> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_bind_group_layout_entry_sampler(
    binding: u32,
    visibility: u32,
    binding_type: u32,
) -> Resource<JSGPUBindGroupLayoutEntry> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "device")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_sampler(
        device: &Resource<JSDevice>,
        label_ptr: usize,
        label_len: usize,
        addressModeU: GPUAddressMode,
        addressModeV: GPUAddressMode,
        addressModeW: GPUAddressMode,
        magFilter: GPUFilterMode,
        minFilter: GPUFilterMode,
        mipmapFilter: GPUFilterMode,
        lodMinClamp: f32,
        lodMaxClamp: f32,
        maxAnisotropy: u16,
    ) -> Resource<JSSampler>;
    pub fn create_bind_group_layout_entry_sampler(
        binding: u32,
        visibility: u32,
        binding_type: u32,
    ) -> Resource<JSGPUBindGroupLayoutEntry>;

}
pub struct JSSampler(());

pub struct GPUSampler {
    externref: Resource<JSSampler>,
}
#[repr(C)]
pub enum GPUFilterMode {
    Nearest,
    Linear,
}
#[repr(C)]
pub enum GPUAddressMode {
    ClampToEdge,
    Repeat,
    MirrorRepeat,
}
impl GPUSampler {
    pub fn new(
        device: &Resource<JSDevice>,
        label: String,
        address_mode_u: GPUAddressMode,
        address_mode_v: GPUAddressMode,
        address_mode_w: GPUAddressMode,
        mag_filter: GPUFilterMode,
        min_filter: GPUFilterMode,
        mipmap_filter: GPUFilterMode,
        lod_min_clamp: f32,
        lod_max_clamp: f32,
        max_anisotropy: u16,
    ) -> Self {
        let externref = unsafe {
            create_sampler(
                device,
                label.as_ptr() as usize,
                label.len(),
                address_mode_u,
                address_mode_v,
                address_mode_w,
                mag_filter,
                min_filter,
                mipmap_filter,
                lod_min_clamp,
                lod_max_clamp,
                max_anisotropy,
            )
        };
        GPUSampler { externref }
    }
}
impl BindGroupBinding for GPUSampler {
    fn push_bindgroup_entry_to_bindgroup(
        &mut self,
        descriptor: &Resource<JSBindGroupDescriptor>,
        i: u32,
    ) {
        unsafe { push_to_bind_group_descriptor(descriptor, i, &self.externref.upcast_ref()) };
    }
}
