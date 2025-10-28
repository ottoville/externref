use std::{cell::RefCell, num::NonZero, rc::Rc};

use crate::{
    color_attachment::{
        color_attachment::{
            create_render_pass_color_attachment_clear, ColorAttachment, JSRenderPassColorAttachment,
        },
        color_attachment_single_sampled::ColorAttachmentSingleSampled,
    },
    device::JSDevice,
    texture::{
        render_attachment_texture::{
            RenderAttachmentFormat, RenderAttachmentTexture, RenderAttachmentTextureMultiSampled,
            RenderAttachmentTextureSingleSampled,
        },
        texture_view::TextureView,
    },
};
use externref::Resource;

pub struct ColorAttachmentMultiSampled {
    pub attachment: ColorAttachmentSingleSampled,
    pub resolve_target: Rc<RefCell<dyn RenderAttachmentTextureSingleSampled + 'static>>,
}

impl ColorAttachmentMultiSampled {
    pub fn new<
        F: RenderAttachmentFormat + Send + Sync + 'static,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
    >(
        texture_view: Rc<RefCell<impl RenderAttachmentTextureMultiSampled + 'static>>,
        resolve_target: Rc<
            RefCell<TextureView<F, 1, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, true>>,
        >,
        clear_value_r: f64,
        clear_value_g: f64,
        clear_value_b: f64,
        clear_value_a: f64,
    ) -> Self {
        ColorAttachmentMultiSampled {
            attachment: ColorAttachmentSingleSampled::new(
                texture_view,
                clear_value_r,
                clear_value_g,
                clear_value_b,
                clear_value_a,
            ),
            resolve_target,
        }
    }

    pub fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        self.attachment
            .texture_view
            .borrow()
            .resize(device, width, height);
        self.resolve_target.borrow().resize(device, width, height);
    }
}
impl ColorAttachment for ColorAttachmentMultiSampled {
    fn texture_view(&self) -> &Rc<RefCell<dyn RenderAttachmentTexture>> {
        &self.attachment.texture_view
    }
    fn get_attachment(&mut self) -> Resource<JSRenderPassColorAttachment> {
        //"get attachment color_Attachment_multi_sampled.rs".log();

        let mut borrowed = self.attachment.texture_view.borrow_mut();
        let view1 = borrowed.get_attachment();
        let mut borrowed2 = self.resolve_target.borrow_mut();

        let view2 = borrowed2.get_attachment();

        unsafe {
            create_render_pass_color_attachment_clear(
                view1,
                -1,
                Some(view2),
                self.attachment.clear_value_r,
                self.attachment.clear_value_g,
                self.attachment.clear_value_b,
                self.attachment.clear_value_a,
                self.attachment.storeopt,
            )
        }
    }
    fn is_dirty(&self) -> bool {
        let borrowed = self.attachment.texture_view.borrow();
        if borrowed.is_dirty() {
            return true;
        }
        let borrowed2 = self.resolve_target.borrow();
        return borrowed2.is_dirty();
    }
}
