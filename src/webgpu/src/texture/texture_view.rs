use std::{marker::PhantomData, num::NonZeroU32};

use externref::externref;
use externref::Resource;

use crate::texture::{
    texture::{JSTexture, Texture, TextureAspect, TextureViewDimension},
    texture_formats::{TextureFormat, TextureFormatSRGB},
};

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_texture_view(
    _texture: &Resource<JSTexture>,
    _label_ptr: usize,
    _label_len: usize,
    _format: u32,
    _dimension: TextureViewDimension,
    _usage: u32,
    _aspect: TextureAspect,
    _base_mip_level: u32,
    _mip_level_count: NonZeroU32,
    _base_array_layer: u32,
    _array_layer_count: NonZeroU32,
) -> Resource<JSTextureView> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "texture")]
extern "C" {
    pub fn create_texture_view(
        texture: &Resource<JSTexture>,
        label_ptr: usize,
        label_len: usize,
        format: u32,
        dimension: TextureViewDimension,
        usage: u32,
        aspect: TextureAspect,
        baseMipLevel: u32,
        mipLevelCount: NonZeroU32,
        baseArrayLayer: u32,
        arrayLayerCount: NonZeroU32,
    ) -> Resource<JSTextureView>;
}
pub struct JSTextureView(());

pub struct TextureView<
    F: TextureFormat,
    const DIMENSION: u32,
    const SAMPLE_COUNT: u32,
    const COPY_SRC: bool = false,
    const COPY_DST: bool = false,
    const TEXTURE_BINDING: bool = false,
    const STORAGE_BINDING: bool = false,
    const RENDER_ATTACHMENT: bool = false,
> {
    pub externref: Resource<JSTextureView>,
    pub format: PhantomData<F>,
}
impl<
        F: TextureFormat,
        const DIMENSION: u32,
        const SAMPLE_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
    >
    TextureView<
        F,
        DIMENSION,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
    >
{
    const fn usages() -> u32 {
        let mut usages = 0;
        if COPY_SRC {
            usages |= 0x0001;
        }
        if COPY_DST {
            usages |= 0x0002;
        }
        if TEXTURE_BINDING {
            usages |= 0x0004;
        }
        if STORAGE_BINDING {
            usages |= 0x0008;
        }
        if RENDER_ATTACHMENT {
            usages |= 0x0010;
        }
        return usages;
    }
    /// # Creates new texture view
    pub fn new<
        const COPY_SRC2: bool,
        const COPY_DST2: bool,
        const TEXTURE_BINDING2: bool,
        const STORAGE_BINDING2: bool,
        const RENDER_ATTACHMENT2: bool,
        const SRGB_MULTIVIEW: bool,
    >(
        texture: &Texture<
            F,
            DIMENSION,
            SAMPLE_COUNT,
            COPY_SRC2,
            COPY_DST2,
            TEXTURE_BINDING2,
            STORAGE_BINDING2,
            RENDER_ATTACHMENT2,
            SRGB_MULTIVIEW,
        >,
        label: String,
        dimension: TextureViewDimension,
        aspect: TextureAspect,
        base_mip_level: u32,
        mip_level_count: NonZeroU32,
        base_array_layer: u32,
        array_layer_count: NonZeroU32,
    ) -> TextureView<
        F,
        DIMENSION,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
    > {
        let externref = unsafe {
            create_texture_view(
                &texture.externref,
                label.as_ptr() as usize,
                label.len(),
                F::to_number(),
                dimension,
                Self::usages(),
                aspect,
                base_mip_level,
                mip_level_count,
                base_array_layer,
                array_layer_count,
            )
        };
        return TextureView {
            externref,
            format: PhantomData,
        };
    }
    pub fn new_srgb<
        const COPY_SRC2: bool,
        const COPY_DST2: bool,
        const TEXTURE_BINDING2: bool,
        const STORAGE_BINDING2: bool,
        const RENDER_ATTACHMENT2: bool,
        VF: TextureFormatSRGB<F>,
    >(
        texture: &Texture<
            VF,
            DIMENSION,
            SAMPLE_COUNT,
            COPY_SRC2,
            COPY_DST2,
            TEXTURE_BINDING2,
            STORAGE_BINDING2,
            RENDER_ATTACHMENT2,
            true,
        >,
        label: String,
        dimension: TextureViewDimension,
        aspect: TextureAspect,
        base_mip_level: u32,
        mip_level_count: NonZeroU32,
        base_array_layer: u32,
        array_layer_count: NonZeroU32,
    ) -> TextureView<
        F,
        DIMENSION,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
    > {
        let externref = unsafe {
            create_texture_view(
                &texture.externref,
                label.as_ptr() as usize,
                label.len(),
                VF::to_srgb(),
                dimension,
                Self::usages(),
                aspect,
                base_mip_level,
                mip_level_count,
                base_array_layer,
                array_layer_count,
            )
        };
        return TextureView {
            externref,
            format: PhantomData,
        };
    }
}

#[cfg(test)]
#[should_panic(
    expected = "texture view usages of testtextureview is not subset of usages of testtexture"
)]
#[test]
fn texture_view_usages() {
    use crate::texture::texture_formats::BGRA8UNORM;
    use externref::ExternRef;
    let device = unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) };
    unsafe {
        let texture = Texture::<BGRA8UNORM, 2, 4, false, false, true, false, true>::new(
            &device,
            300,
            300,
            1,
            String::from("testtexture"),
            1,
        )
        .create_view::<true, false, true, false, true>(
            String::from("testtextureview"),
            TextureViewDimension::d2,
            TextureAspect::all,
            1,
            NonZeroU32::new_unchecked(1),
            1,
            NonZeroU32::new_unchecked(1),
        );
    }
}
