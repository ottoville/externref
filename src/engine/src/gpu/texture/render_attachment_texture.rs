use crate::gpu::texture::{
    texture::Texture,
    texture_formats::{TextureFormat, TFORMAT},
};

pub trait RenderAttachment: TextureFormat {}
impl RenderAttachment for TFORMAT<26> {}
impl RenderAttachment for TFORMAT<2> {}
/*
If descriptor.usage includes the RENDER_ATTACHMENT bit:
descriptor.format must be a renderable format.
descriptor.dimension must be either "2d" or "3d".
*/
pub trait RenderAttachmentTexture {}
impl<
        F: RenderAttachment,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const SRGB_MULTIVIEW: bool,
    > RenderAttachmentTexture
    for Texture<F, 2, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, true, SRGB_MULTIVIEW>
{
}

impl<
        F: RenderAttachment,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const SRGB_MULTIVIEW: bool,
    > RenderAttachmentTexture
    for Texture<F, 3, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, true, SRGB_MULTIVIEW>
{
}
