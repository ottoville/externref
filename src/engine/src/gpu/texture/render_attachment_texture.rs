use crate::gpu::texture::{
    texture::Texture,
    texture_formats::{TextureFormat, TFORMAT},
    valid_texture::ValidTexture,
};

pub trait RenderAttachmentFormat: TextureFormat {}
impl<const U: u32> RenderAttachmentFormat for TFORMAT<U, true> {}

/*
If descriptor.usage includes the RENDER_ATTACHMENT bit:
descriptor.format must be a renderable format.
descriptor.dimension must be either "2d" or "3d".
*/
pub trait RenderAttachmentTexture: ValidTexture {}
// 2-dimensioned texture
impl<
        F: RenderAttachmentFormat,
        const SAMPLE_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const SRGB_MULTIVIEW: bool,
    > RenderAttachmentTexture
    for Texture<
        F,
        2,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        true,
        SRGB_MULTIVIEW,
    > where Texture<
        F,
        2,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        true,
        SRGB_MULTIVIEW,
    > : ValidTexture
{
}
// 3-dimensioned texture, enforce 1 samplecount
impl<
        F: RenderAttachmentFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const SRGB_MULTIVIEW: bool,
    > RenderAttachmentTexture
    for Texture<F, 3, 1, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, true, SRGB_MULTIVIEW>
{
}
pub trait RenderAttachmentTextureMultiSampled: RenderAttachmentTexture {}
// 2-dimensioned texture, multisampled
// If descriptor.sampleCount > 1:
// descriptor.usage must not include the STORAGE_BINDING bit.
// descriptor.usage must include the RENDER_ATTACHMENT bit.
// https://www.w3.org/TR/webgpu/#abstract-opdef-validating-gputexturedescriptor
impl<
        F: RenderAttachmentFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const SRGB_MULTIVIEW: bool,
    > RenderAttachmentTextureMultiSampled
    for Texture<F, 2, 4, COPY_SRC, COPY_DST, TEXTURE_BINDING, false, true, SRGB_MULTIVIEW>
{
}
pub trait RenderAttachmentTextureSingleSampled: RenderAttachmentTexture {}
// 2-dimensioned texture, singlesampled
impl<
        F: RenderAttachmentFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const SRGB_MULTIVIEW: bool,
    > RenderAttachmentTextureSingleSampled
    for Texture<F, 2, 1, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, true, SRGB_MULTIVIEW>
{
}
// 3-dimensioned texture, singlesampled
impl<
        F: RenderAttachmentFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const SRGB_MULTIVIEW: bool,
    > RenderAttachmentTextureSingleSampled
    for Texture<F, 3, 1, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, true, SRGB_MULTIVIEW>
{
}
