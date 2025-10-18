use std::{
    cell::RefCell,
    num::{NonZero, NonZeroU32},
    rc::Rc,
};

use externref::Resource;

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

pub struct ColorAttachmentMultiSampled {
    pub attachment: ColorAttachmentSingleSampled,
    pub resolve_target: Rc<RefCell<dyn RenderAttachmentTextureSingleSampled + 'static>>,
    version: NonZeroU32,
    version_resolve_target: NonZeroU32,
}

impl ColorAttachmentMultiSampled {
    pub fn new<
        F: RenderAttachmentFormat + 'static,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
    >(
        texture_view: Rc<RefCell<impl RenderAttachmentTextureMultiSampled + 'static>>,
        resolve_target: Rc<
            RefCell<
                TextureView<F, 2, 1, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, true>,
            >,
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
            version: unsafe { NonZeroU32::new_unchecked(9999) },
            version_resolve_target: unsafe { NonZeroU32::new_unchecked(9999) },
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
        let borrowed = self.attachment.texture_view.borrow();
        let some_new_version = borrowed.version();
        if let Some(new_version) = some_new_version {
            self.version = new_version;
        }
        let borrowed2 = self.resolve_target.borrow();
        let some_new_version = borrowed2.version();
        if let Some(new_version) = some_new_version {
            self.version_resolve_target = new_version;
        }
        unsafe {
            create_render_pass_color_attachment_clear(
                borrowed.get_attachment(),
                -1,
                Some(borrowed2.get_attachment()),
                self.attachment.clear_value_r,
                self.attachment.clear_value_g,
                self.attachment.clear_value_b,
                self.attachment.clear_value_a,
                self.attachment.storeopt,
            )
        }
    }
    fn is_dirty(&self) -> bool {
        let dirty = match self.attachment.texture_view.borrow().version() {
            Some(version) => version != self.version,
            None => false,
        };
        if dirty {
            return false;
        }
        return match self.resolve_target.borrow().version() {
            Some(version) => version != self.version_resolve_target,
            None => false,
        };
    }
}
