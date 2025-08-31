use crate::gpu::texture::{render_attachment_texture::{RenderAttachmentTexture, RenderAttachmentTextureSingleSampled}, valid_texture::ValidTexture};

pub struct CanvasContext {
    pub format: u32
}
impl ValidTexture for CanvasContext {
    fn to_number(&self) -> u32 {
        self.format
    }
}
impl RenderAttachmentTexture for CanvasContext {
    
}
impl RenderAttachmentTextureSingleSampled for CanvasContext {
    
}