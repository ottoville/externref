use webgpu::texture::render_attachment_texture::{
    RenderAttachmentTexture, RenderAttachmentTextureSingleSampled,
};

pub struct CanvasContext {
    pub format: u32,
}
impl RenderAttachmentTexture for CanvasContext {
    fn to_number(&self) -> u32 {
        self.format
    }
}
impl RenderAttachmentTextureSingleSampled for CanvasContext {}
