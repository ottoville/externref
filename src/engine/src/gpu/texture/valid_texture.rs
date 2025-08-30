use crate::gpu::texture::{texture::Texture, texture_formats::TextureFormat};

pub trait ValidTexture {
    fn to_number(&self) -> u32;
}

// Single sampled
impl<
        F: TextureFormat,
        const DIMENSION: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    > ValidTexture
    for Texture<
        F,
        DIMENSION,
        1,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
{
    fn to_number(&self) -> u32 {
        F::to_number()
    }
}

// Multi sampled
/*
If descriptor.sampleCount > 1:
descriptor.usage must not include the STORAGE_BINDING bit.
descriptor.usage must include the RENDER_ATTACHMENT bit.


If this.sampleCount > 1, descriptor.dimension must be "2d".


 */
impl<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const SRGB_MULTIVIEW: bool,
    > ValidTexture
    for Texture<F, 2, 4, COPY_SRC, COPY_DST, TEXTURE_BINDING, false, true, SRGB_MULTIVIEW>
{
    fn to_number(&self) -> u32 {
        F::to_number()
    }
}
