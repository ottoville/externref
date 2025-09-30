use externref::Resource;

use crate::texture::{
    render_attachment_texture::RenderAttachmentTexture, texture_view::JSTextureView,
};

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_render_pass_color_attachment_clear(
    _view: &Resource<JSTextureView>,
    _depth_slice: i32,
    _resolve_target: Option<&Resource<JSTextureView>>,
    _clear_value_r: f64,
    _clear_value_g: f64,
    _clear_value_b: f64,
    _clear_value_a: f64,
    _store_opt: StoreOpt,
) -> Resource<JSRenderPassColorAttachment> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "renderpassencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_render_pass_color_attachment_clear(
        view: &Resource<JSTextureView>,
        depth_slice: i32,
        resolveTarget: Option<&Resource<JSTextureView>>,
        clearValueR: f64,
        clearValueG: f64,
        clearValueB: f64,
        clearValueA: f64,
        store_opt: StoreOpt,
    ) -> Resource<JSRenderPassColorAttachment>;
    pub fn create_render_pass_color_attachment_load(
        view: &Resource<JSTextureView>,
        depth_slice: i32,
        resolveTarget: &Resource<JSTextureView>,
        store_opt: StoreOpt,
    ) -> Resource<JSRenderPassColorAttachment>;
}
pub struct JSRenderPassColorAttachment(());
#[derive(Copy, Clone)]
#[repr(C)]
pub enum StoreOpt {
    Store,
    Discard,
}

pub trait ColorAttachment {
    fn texture_view(&self) -> &Box<dyn RenderAttachmentTexture + Send>;
}
