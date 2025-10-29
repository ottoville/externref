use std::cell::Cell;

use externref::Resource;

use crate::color_attachment::{
    color_attachment::JSRenderPassColorAttachment,
    depth_stencil_attachment::JSRenderPassDepthStencilAttachment,
};

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_render_pass_descriptor(
    _label_ptr: usize,
    _label_len: usize,
    _depth_stencil_attachment: Option<&Resource<JSRenderPassDepthStencilAttachment>>,
) -> Resource<JSRenderPassDescriptor> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn push_color_attachment_to_render_pass_descriptor(
    descriptor: &Resource<JSRenderPassDescriptor>,
    color_attachment: &Resource<JSRenderPassColorAttachment>,
) {
}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "commandencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_render_pass_descriptor(
        label_ptr: usize,
        label_len: usize,
        depth_stencil_attachment: Option<&Resource<JSRenderPassDepthStencilAttachment>>,
    ) -> Resource<JSRenderPassDescriptor>;
    pub fn push_color_attachment_to_render_pass_descriptor(
        descriptor: &Resource<JSRenderPassDescriptor>,
        color_attachment: &Resource<JSRenderPassColorAttachment>,
    );
}
thread_local! {
    static COLORATTACHMENT_EXTERNREF: Cell<Option<Resource<JSRenderPassColorAttachment>>> = const { Cell::new(None) };
}

pub struct JSRenderPassDescriptor(());
