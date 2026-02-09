use crate::bindgroup::bindgroup::JSBindGroup;
use crate::bindgroup::bindgroup_descriptor::JSBindGroupDescriptor;
use crate::bindgroup_layout::JSBindGroupLayout;
use crate::binding_layout::BindingLayout;
use crate::command_encoder::JSCommandEncoder;
use crate::queue::{JSQueue, Queue};
use crate::texture::texture::JSTexture;
use externref::Resource;

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_texture(
    _device: &Resource<JSDevice>,
    _width: u32,
    _height: u32,
    _depth_or_array_layers: u32,
    _label_ptr: usize,
    _label_len: usize,
    _usages: u32,
    _mip_level_count: u32,
    _sample_count: u32,
    _dimension: u32,
    _format: u32,
    _viewformats_ptr: usize,
    _viewformats_len: usize,
) -> Resource<JSTexture> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_bind_group_layout(
    _device: &Resource<JSDevice>,
    _label_ptr: usize,
    _label_len: usize,

    _entries: *mut std::slice::Iter<'_, &dyn BindingLayout>,
) -> Resource<JSBindGroupLayout> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_gpu_command_encoder(
    _device: &Resource<JSDevice>,
    _label_ptr: usize,
    _label_len: usize,
) -> Resource<JSCommandEncoder> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_bind_group(
    _device: &Resource<JSDevice>,
    _descriptor: &Resource<JSBindGroupDescriptor>,
) -> Resource<JSBindGroup> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn get_queue(_device: &Resource<JSDevice>) -> Resource<JSQueue> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "device")]
extern "C" {
    pub fn create_bind_group_layout(
        device: &Resource<JSDevice>,
        label_ptr: usize,
        label_len: usize,
        entries: *mut std::slice::Iter<'_, &dyn BindingLayout>,
    ) -> Resource<JSBindGroupLayout>;
    pub fn create_texture(
        device: &Resource<JSDevice>,
        width: u32,
        height: u32,
        depthOrArrayLayers: u32,
        label_ptr: usize,
        label_len: usize,
        usages: u32,
        mipLevelCount: u32,
        sampleCount: u32,
        dimension: u32,
        format: u32,
        viewformats_ptr: usize,
        viewformats_len: usize,
    ) -> Resource<JSTexture>;
    pub fn create_bind_group(
        device: &Resource<JSDevice>,
        descriptor: &Resource<JSBindGroupDescriptor>,
    ) -> Resource<JSBindGroup>;
    pub fn create_gpu_command_encoder(
        device: &Resource<JSDevice>,
        label_ptr: usize,
        label_len: usize,
    ) -> Resource<JSCommandEncoder>;
    pub fn get_queue(device: &Resource<JSDevice>) -> Resource<JSQueue>;
}
pub struct JSDevice();
pub struct GPUDevice {
    pub externref: Resource<JSDevice>,
    pub queue: Queue,
}
impl GPUDevice {
    pub fn new(externref: Resource<JSDevice>) -> Self {
        let queue = unsafe { get_queue(&externref) };
        GPUDevice {
            externref,
            queue: Queue::new(queue),
        }
    }
}
