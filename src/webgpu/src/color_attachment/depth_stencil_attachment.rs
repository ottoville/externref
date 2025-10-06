use std::num::NonZero;

use externref::Resource;

use crate::{
    color_attachment::color_attachment::StoreOpt,
    device::JSDevice,
    texture::{depth_texture::DepthTexture, texture_view::JSTextureView},
};
#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_render_pass_depth_stencil_attachment(
    _view: &Resource<JSTextureView>,
    _depth_clear_value: f32,
    _depth_read_only: bool,
    _depth_store_op_enum: StoreOpt,
) -> Resource<JSRenderPassDepthStencilAttachment> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}
#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "renderpassencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_render_pass_depth_stencil_attachment(
        view: &Resource<JSTextureView>,
        depth_clear_value: f32,
        depth_read_only: bool,
        depth_store_op_enum: StoreOpt,
    ) -> Resource<JSRenderPassDepthStencilAttachment>;
}
pub struct JSRenderPassDepthStencilAttachment(());

pub struct DepthStencilAttachment<const SAMPLE_COUNT: u32> {
    pub texture_view: Box<dyn DepthTexture<SAMPLE_COUNT>>,
    pub externref: Resource<JSRenderPassDepthStencilAttachment>,
}
impl<const SAMPLE_COUNT: u32> DepthStencilAttachment<SAMPLE_COUNT> {
    pub fn new(
        texture_view: impl DepthTexture<SAMPLE_COUNT> + 'static,
        depth_clear_value: f32,
        depth_read_only: bool,
        depth_store_op_enum: StoreOpt,
    ) -> Self {
        let externref = unsafe {
            create_render_pass_depth_stencil_attachment(
                texture_view.get_attachment(),
                depth_clear_value,
                depth_read_only,
                depth_store_op_enum,
            )
        };
        DepthStencilAttachment {
            texture_view: Box::new(texture_view),
            externref,
        }
    }
    pub fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        self.texture_view.resize(device, width, height);
    }
}
