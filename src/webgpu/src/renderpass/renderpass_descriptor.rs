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
    _views: ColorAttachmentsPtr,
    _depth_stencil_attachment: Option<&Resource<JSRenderPassDepthStencilAttachment>>,
) -> Resource<JSRenderPassDescriptor> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

type ColorAttachmentsPtr<'a> =
    *mut &'a mut dyn Iterator<Item = Resource<JSRenderPassColorAttachment>>;

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "commandencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_render_pass_descriptor(
        label_ptr: usize,
        label_len: usize,
        views: ColorAttachmentsPtr,
        depth_stencil_attachment: Option<&Resource<JSRenderPassDepthStencilAttachment>>,
    ) -> Resource<JSRenderPassDescriptor>;
}
thread_local! {
    static COLORATTACHMENT_EXTERNREF: Cell<Option<Resource<JSRenderPassColorAttachment>>> = const { Cell::new(None) };
}

pub struct JSRenderPassDescriptor(());

#[externref::externref]
#[no_mangle]
pub unsafe extern "C" fn iterate_colorattachments<'a>(
    iterator_ptr: ColorAttachmentsPtr,
) -> Option<&'a Resource<JSRenderPassColorAttachment>> {
    let next = (*iterator_ptr).next();
    if next.is_none() {
        drop(Box::from_raw(iterator_ptr));
    }
    COLORATTACHMENT_EXTERNREF.set(next);
    let value = COLORATTACHMENT_EXTERNREF.with(|n| {
        return n.as_ptr();
    });
    return (*value).as_ref();
}
