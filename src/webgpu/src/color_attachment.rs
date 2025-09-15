use externref::{externref, Resource};

use crate::texture::{
    render_attachment_texture::{RenderAttachmentTexture, RenderAttachmentTextureMultiSampled},
    texture_view::JSTextureView,
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
    _store_opt: u32,
) -> Resource<JSRenderPassColorAttachment> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}

#[cfg(target_arch = "wasm32")]
#[externref]
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
        store_opt: u32,
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
pub enum StoreOpt {
    Store,
    Discard,
}
pub struct ColorAttachment {
    pub texture_view: Box<dyn RenderAttachmentTexture + Send>,
    storeopt: StoreOpt,
    clear_value_r: f64,
    clear_value_g: f64,
    clear_value_b: f64,
    clear_value_a: f64,
}
impl ColorAttachment {
    pub fn new(
        texture_view: impl RenderAttachmentTexture + Send + 'static,
        clear_value_r: f64,
        clear_value_g: f64,
        clear_value_b: f64,
        clear_value_a: f64,
    ) -> Self {
        ColorAttachment {
            texture_view: Box::new(texture_view),
            storeopt: StoreOpt::Store,
            clear_value_r,
            clear_value_g,
            clear_value_b,
            clear_value_a,
        }
    }
    pub fn get_attachment(&mut self) -> Resource<JSRenderPassColorAttachment> {
        let view = self.texture_view.get_attachment();
        unsafe {
            create_render_pass_color_attachment_clear(
                view,
                0,
                None,
                self.clear_value_r,
                self.clear_value_g,
                self.clear_value_b,
                self.clear_value_a,
                self.storeopt as u32,
            )
        }
    }
}
pub struct ColorAttachmentMultiSampled(pub ColorAttachment);
impl ColorAttachmentMultiSampled {
    pub fn new(
        texture_view: impl RenderAttachmentTextureMultiSampled + Send + 'static,
        clear_value_r: f64,
        clear_value_g: f64,
        clear_value_b: f64,
        clear_value_a: f64,
    ) -> Self {
        ColorAttachmentMultiSampled(ColorAttachment {
            texture_view: Box::new(texture_view),
            storeopt: StoreOpt::Discard,
            clear_value_r,
            clear_value_g,
            clear_value_b,
            clear_value_a,
        })
    }
}
