use std::num::NonZero;

use externref::Resource;

use crate::{
    color_attachment::{
        color_attachment::{
            create_render_pass_color_attachment_clear, ColorAttachment,
            JSRenderPassColorAttachment, StoreOpt,
        },
        color_attachment_single_sampled::ColorAttachmentSingleSampled,
    }, device::JSDevice, texture::{
        render_attachment_texture::{
            RenderAttachmentFormat, RenderAttachmentTextureMultiSampled,
            RenderAttachmentTextureSingleSampled,
        },
        texture_view::TextureView,
    }
};

pub struct ColorAttachmentMultiSampled {
    pub attachment: ColorAttachmentSingleSampled,
    pub resolve_target: Box<dyn RenderAttachmentTextureSingleSampled + Send + 'static>,
}

impl ColorAttachmentMultiSampled {
    pub fn new<
        F: RenderAttachmentFormat + Send + 'static,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
    >(
        texture_view: impl RenderAttachmentTextureMultiSampled + Send + 'static,
        resolve_target: TextureView<
            F,
            2,
            1,
            COPY_SRC,
            COPY_DST,
            TEXTURE_BINDING,
            STORAGE_BINDING,
            true,
        >,
        clear_value_r: f64,
        clear_value_g: f64,
        clear_value_b: f64,
        clear_value_a: f64,
    ) -> Self {
        ColorAttachmentMultiSampled {
            attachment: ColorAttachmentSingleSampled {
                texture_view: Box::new(texture_view),
                storeopt: StoreOpt::Discard,
                clear_value_r,
                clear_value_g,
                clear_value_b,
                clear_value_a,
            },
            resolve_target: Box::new(resolve_target),
        }
    }
    pub fn get_attachment(&mut self) -> Resource<JSRenderPassColorAttachment> {
        unsafe {
            create_render_pass_color_attachment_clear(
                self.attachment.texture_view.get_attachment(),
                -1,
                Some(self.resolve_target.get_attachment()),
                self.attachment.clear_value_r,
                self.attachment.clear_value_g,
                self.attachment.clear_value_b,
                self.attachment.clear_value_a,
                self.attachment.storeopt as u32,
            )
        }
    }
    pub fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        self.attachment.texture_view.resize(device, width, height);
        self.resolve_target.resize(device, width, height);
    }
}
impl ColorAttachment for ColorAttachmentMultiSampled {
    fn texture_view(
        &self,
    ) -> &Box<dyn crate::texture::render_attachment_texture::RenderAttachmentTexture + Send> {
        &self.attachment.texture_view
    }
}
