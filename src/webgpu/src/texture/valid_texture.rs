use crate::texture::{texture::{Texture, TextureDimensionTrait}, texture_formats::TextureFormat};

pub trait ValidTexture : TextureDimensionTrait {
    fn to_number(&self) -> u32;
}

// Single sampled
impl<
        F: TextureFormat,
        const DIMENSION: u32,
        const DEPTH_OR_ARRAY_LAYERS: u32,
        const MIP_LEVEL_COUNT: u32,
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
        DEPTH_OR_ARRAY_LAYERS,
        MIP_LEVEL_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    > where Texture<
        F,
        DIMENSION,
        1,
        DEPTH_OR_ARRAY_LAYERS,
        MIP_LEVEL_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >: TextureDimensionTrait
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
If this.sampleCount > 1, descriptor.mipLevelCount must be 1.
If this.sampleCount > 1, descriptor.size.depthOrArrayLayers must be 1.

 */
impl<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const SRGB_MULTIVIEW: bool,
    > ValidTexture
    for Texture<
        F,
        2,
        4,
        1,
        1,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        false,
        true,
        SRGB_MULTIVIEW,
    >
{
    fn to_number(&self) -> u32 {
        F::to_number()
    }
}
