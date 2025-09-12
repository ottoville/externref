use crate::texture::{
    texture::Texture,
    texture_formats::{TextureFormat, TFORMAT},
    valid_texture::ValidTexture,
};

pub trait DepthTexture: ValidTexture {}

pub trait DepthTextureFormat: TextureFormat {}

impl<const U: u32> DepthTextureFormat for TFORMAT<U, true, true> {}
// 2-dimensioned texture
impl<
        F: DepthTextureFormat,
        const SAMPLE_COUNT: u32,
        const DEPTH_OR_ARRAY_LAYERS: u32,
        const MIP_LEVEL_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    > DepthTexture
    for Texture<
        F,
        2,
        SAMPLE_COUNT,
        DEPTH_OR_ARRAY_LAYERS,
        MIP_LEVEL_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        false, // https://www.w3.org/TR/webgpu/#depth-formats
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
where
    Texture<
        F,
        2,
        SAMPLE_COUNT,
        DEPTH_OR_ARRAY_LAYERS,
        MIP_LEVEL_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        false, // https://www.w3.org/TR/webgpu/#depth-formats
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >: ValidTexture,
{
}
