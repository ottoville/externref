use std::{cell::RefCell, num::NonZero, rc::Rc};

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

pub struct DepthStencilAttachment<const DEPTH_READ_ONLY: bool> {
    pub texture_view: Rc<RefCell<dyn DepthTexture>>,
    externref: Resource<JSRenderPassDepthStencilAttachment>,
    depth_clear_value: f32,
    depth_store_op_enum: StoreOpt,
}
impl<const DEPTH_READ_ONLY: bool>
    DepthStencilAttachment<DEPTH_READ_ONLY>
{
    pub fn new(
        texture_view: Rc<RefCell<impl DepthTexture + 'static>>,
        depth_clear_value: f32,
        depth_store_op_enum: StoreOpt,
    ) -> Self {
        let externref = {
            let mut borrowed = texture_view.borrow_mut();
            unsafe {
                create_render_pass_depth_stencil_attachment(
                    borrowed.get_attachment(),
                    depth_clear_value,
                    DEPTH_READ_ONLY,
                    depth_store_op_enum,
                )
            }
        };
        DepthStencilAttachment {
            texture_view,
            externref,
            depth_clear_value,
            depth_store_op_enum,
        }
    }
    pub fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        self.texture_view.borrow().resize(device, width, height);
    }
    pub fn is_dirty(&self) -> bool {
        let borrowed = self.texture_view.borrow();
        return borrowed.is_dirty();
    }
    pub fn get_attachment(&mut self) -> &Resource<JSRenderPassDepthStencilAttachment> {
        let mut borrowed = self.texture_view.borrow_mut();
        if borrowed.is_dirty() {
            self.externref = unsafe {
                create_render_pass_depth_stencil_attachment(
                    borrowed.get_attachment(),
                    self.depth_clear_value,
                    DEPTH_READ_ONLY,
                    self.depth_store_op_enum,
                )
            };
        }
        return &self.externref;
    }
}
