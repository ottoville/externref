use externref::Resource;

use crate::{
    color_attachment::color_attachment::{
        create_render_pass_color_attachment_clear, ColorAttachment, JSRenderPassColorAttachment,
        StoreOpt,
    },
    texture::render_attachment_texture::RenderAttachmentTexture,
};

pub struct ColorAttachmentSingleSampled {
    pub texture_view: Box<dyn RenderAttachmentTexture + Send>,
    pub storeopt: StoreOpt,
    pub clear_value_r: f64,
    pub clear_value_g: f64,
    pub clear_value_b: f64,
    pub clear_value_a: f64,
}
impl ColorAttachmentSingleSampled {
    pub fn new(
        texture_view: impl RenderAttachmentTexture + Send + 'static,
        clear_value_r: f64,
        clear_value_g: f64,
        clear_value_b: f64,
        clear_value_a: f64,
    ) -> Self {
        ColorAttachmentSingleSampled {
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
                -1,
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

impl ColorAttachment for ColorAttachmentSingleSampled {
    fn texture_view(
        &self,
    ) -> &Box<dyn crate::texture::render_attachment_texture::RenderAttachmentTexture + Send> {
        &self.texture_view
    }
}
