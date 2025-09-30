use crate::texture::{
    render_attachment_texture::{RenderAttachmentFormat, RenderAttachmentTexture},
    texture_formats::TFORMAT,
    texture_view::TextureView,
};

pub trait DepthTexture: RenderAttachmentTexture {}
pub trait DepthTextureFormat: RenderAttachmentFormat {}

impl<const U: u32> DepthTextureFormat for TFORMAT<U, true, true> {}
// 2-dimensioned texture
impl<
        F: DepthTextureFormat,
        const SAMPLE_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
    > DepthTexture
    for TextureView<
        F,
        2,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        false, // https://www.w3.org/TR/webgpu/#depth-formats
        true,
    >
{
}
