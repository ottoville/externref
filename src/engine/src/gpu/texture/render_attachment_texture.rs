use crate::gpu::texture::{texture::Texture, texture_formats::{TextureFormatTrait, BGRA8UNORM, R8UINT}};


pub trait RenderAttachment: TextureFormatTrait {}
impl RenderAttachment for BGRA8UNORM {}
impl RenderAttachment for R8UINT	 {}
/*
If descriptor.usage includes the RENDER_ATTACHMENT bit:
descriptor.format must be a renderable format.
descriptor.dimension must be either "2d" or "3d".
*/
pub trait RenderAttachmentTexture {}
impl<
        F: RenderAttachment,
        VF,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
    > RenderAttachmentTexture
    for Texture<F,VF, 2, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, true>
{
}

impl<
        F: RenderAttachment,
        VF,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
    > RenderAttachmentTexture
    for Texture<F, VF, 3, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, true>
{
}
