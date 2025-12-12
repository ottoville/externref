use std::{cell::RefCell, num::NonZero, rc::Rc};

use externref::Resource;

use crate::{
    color_attachment::color_attachment::{
        create_render_pass_color_attachment_clear, ColorAttachment, JSRenderPassColorAttachment,
        StoreOpt,
    },
    device::JSDevice,
    texture::render_attachment_texture::RenderAttachmentTexture,
};

pub struct ColorAttachmentSingleSampled {
    pub texture_view: Rc<RefCell<dyn RenderAttachmentTexture>>,
    pub storeopt: StoreOpt,
    pub clear_value_r: f64,
    pub clear_value_g: f64,
    pub clear_value_b: f64,
    pub clear_value_a: f64,
    externref: Resource<JSRenderPassColorAttachment>,
}
impl ColorAttachmentSingleSampled {
    pub fn new(
        texture_view: Rc<RefCell<impl RenderAttachmentTexture + 'static>>,
        clear_value_r: f64,
        clear_value_g: f64,
        clear_value_b: f64,
        clear_value_a: f64,
    ) -> Self {
        let externref = {
            let mut borrowed = texture_view.borrow_mut();
            let view = borrowed.get_attachment();
            unsafe {
                create_render_pass_color_attachment_clear(
                    view,
                    -1,
                    None,
                    clear_value_r,
                    clear_value_g,
                    clear_value_b,
                    clear_value_a,
                    StoreOpt::Store,
                )
            }
        };
        ColorAttachmentSingleSampled {
            texture_view,
            storeopt: StoreOpt::Store,
            clear_value_r,
            clear_value_g,
            clear_value_b,
            clear_value_a,
            externref,
        }
    }
}

impl ColorAttachment<1> for ColorAttachmentSingleSampled {
    fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        self.texture_view.borrow().resize(device, width, height);
    }
    fn texture_view(&self) -> &Rc<RefCell<dyn RenderAttachmentTexture>> {
        &self.texture_view
    }
    fn get_attachment(&mut self) -> &Resource<JSRenderPassColorAttachment> {
        let mut borrowed = self.texture_view.borrow_mut();
        if borrowed.is_dirty() {
            let view = borrowed.get_attachment();
            self.externref = unsafe {
                create_render_pass_color_attachment_clear(
                    view,
                    -1,
                    None,
                    self.clear_value_r,
                    self.clear_value_g,
                    self.clear_value_b,
                    self.clear_value_a,
                    self.storeopt,
                )
            }
        };
        return &self.externref;
    }
    fn is_dirty(&self) -> bool {
        let borrowed = self.texture_view.borrow();
        return borrowed.is_dirty();
    }
}
