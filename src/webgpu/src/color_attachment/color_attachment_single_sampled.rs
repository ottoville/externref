use std::{
    cell::RefCell,
    num::{NonZero, NonZeroU32},
    rc::Rc,
};

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
    pub externref: Resource<JSRenderPassColorAttachment>,
    version: NonZeroU32,
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
            let borrowed = texture_view.borrow();
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
            version: unsafe { NonZeroU32::new_unchecked(9999) },
        }
    }
    pub fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        self.texture_view.borrow().resize(device, width, height);
    }
}

impl ColorAttachment for ColorAttachmentSingleSampled {
    fn texture_view(&self) -> &Rc<RefCell<dyn RenderAttachmentTexture>> {
        &self.texture_view
    }
    fn get_attachment(&mut self) -> Resource<JSRenderPassColorAttachment> {
        let borrowed = self.texture_view.borrow();
        let view = borrowed.get_attachment();
        let some_new_version = borrowed.version();
        if let Some(new_version) = some_new_version {
            self.version = new_version;
        }
        unsafe {
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
    }
    fn is_dirty(&self) -> bool {
        match self.texture_view.borrow().version() {
            Some(version) => version.get() != self.version.get(),
            None => {
                return true;
            }
        }
    }
}
