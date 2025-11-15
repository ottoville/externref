use crate::bindgroup_layout::JSBindGroupLayout;
use crate::buffer::buffer::JSBuffer;
use externref::Resource;

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_buffer_binding(
    _buffer: &Resource<JSBuffer>,
    _offset: usize,
    _size: usize,
) -> Resource<JSBufferBinding> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_bind_group_descriptor(
    _layout: &Resource<JSBindGroupLayout>,
    _label_ptr: usize,
    _label_len: usize,
) -> Resource<JSBindGroupDescriptor> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn push_to_bind_group_descriptor(
    _descriptor: &Resource<JSBindGroupDescriptor>,
    _binding: u32,
    _resource: &Resource<()>,
) {}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "bindgroup")]
extern "C" {
    pub fn create_bind_group_descriptor(
        layout: &Resource<JSBindGroupLayout>,
        label_ptr: usize,
        label_len: usize,
    ) -> Resource<JSBindGroupDescriptor>;
    pub fn create_buffer_binding(
        buffer: &Resource<JSBuffer>,
        offset: usize,
        size: usize,
    ) -> Resource<JSBufferBinding>;
    pub fn push_to_bind_group_descriptor(
        descriptor: &Resource<JSBindGroupDescriptor>,
        binding: u32,
        resource: &Resource<()>,
    );
}
pub struct JSBindGroupDescriptor(());
pub struct JSBufferBinding(());
