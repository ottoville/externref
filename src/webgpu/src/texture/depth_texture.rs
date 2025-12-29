use crate::texture::{
    render_attachment_texture::{RenderAttachmentFormat, RenderAttachmentTexture},
    texture_formats::TFORMAT,
    texture_view::TextureView,
};

pub trait DepthTexture2<const SAMPLE_COUNT: u32>: DepthTexture {}
pub trait DepthTexture: RenderAttachmentTexture {}
pub trait DepthTextureFormat: RenderAttachmentFormat {}

impl<const U: u32> DepthTextureFormat for TFORMAT<U, true, true> {}
// 2-dimensioned texture
impl<
        F: DepthTextureFormat + Sync + Send + 'static,
        const SAMPLE_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const BASE_MIP_LEVEL: u32,
        const MIP_LEVEL_COUNT: u32,
        const BASE_ARRAY_LAYER: u32,
        const ARRAY_LAYER_COUNT: u32,
    > DepthTexture
    for TextureView<
        F,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        false, // https://www.w3.org/TR/webgpu/#depth-formats
        true,
        BASE_MIP_LEVEL,
        MIP_LEVEL_COUNT,
        BASE_ARRAY_LAYER,
        ARRAY_LAYER_COUNT,
    >
{
}
impl<
        F: DepthTextureFormat + Sync + Send + 'static,
        const SAMPLE_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const BASE_MIP_LEVEL: u32,
        const MIP_LEVEL_COUNT: u32,
        const BASE_ARRAY_LAYER: u32,
        const ARRAY_LAYER_COUNT: u32,
    > DepthTexture2<SAMPLE_COUNT>
    for TextureView<
        F,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        false, // https://www.w3.org/TR/webgpu/#depth-formats
        true,
        BASE_MIP_LEVEL,
        MIP_LEVEL_COUNT,
        BASE_ARRAY_LAYER,
        ARRAY_LAYER_COUNT,
    >
{
}
