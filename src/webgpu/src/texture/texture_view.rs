use std::marker::PhantomData;

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
    _mip_level_count: u32,
    _base_array_layer: u32,
    _array_layer_count: u32,
) -> Resource<JSTextureView> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref::externref]
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
        mipLevelCount: u32,
        baseArrayLayer: u32,
        arrayLayerCount: u32,
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
    pub label: String,
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
        const ARRAY_LAYER_COUNT: u32,
        const BASE_ARRAY_LAYER: u32,
        const TEXTURE_DEPTH_OR_ARRAY_LAYERS: u32,
        const TEXTURE_MIP_LEVEL_COUNT: u32,
        const BASE_MIP_LEVEL: u32,
        const MIP_LEVEL_COUNT: u32,
    >(
        texture: &Texture<
            F,
            DIMENSION,
            SAMPLE_COUNT,
            TEXTURE_DEPTH_OR_ARRAY_LAYERS,
            TEXTURE_MIP_LEVEL_COUNT,
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
        // descriptor.mipLevelCount must be > 0.
        const { assert!(MIP_LEVEL_COUNT > 0) };
        // descriptor.baseMipLevel + descriptor.mipLevelCount must be ≤ this.mipLevelCount.
        const { assert!(BASE_MIP_LEVEL + MIP_LEVEL_COUNT <= TEXTURE_MIP_LEVEL_COUNT) };
        // descriptor.arrayLayerCount must be > 0.
        const { assert!(ARRAY_LAYER_COUNT > 0) };
        // descriptor.baseArrayLayer + descriptor.arrayLayerCount must be ≤ the array layer count of this.
        const { assert!(BASE_ARRAY_LAYER + ARRAY_LAYER_COUNT <= TEXTURE_DEPTH_OR_ARRAY_LAYERS) };

        let externref = unsafe {
            create_texture_view(
                &texture.externref,
                label.as_ptr() as usize,
                label.len(),
                F::to_number(),
                dimension,
                Self::usages(),
                aspect,
                BASE_MIP_LEVEL,
                MIP_LEVEL_COUNT,
                BASE_ARRAY_LAYER,
                ARRAY_LAYER_COUNT,
            )
        };
        return TextureView {
            externref,
            format: PhantomData,
            label,
        };
    }
    pub fn new_srgb<
        const COPY_SRC2: bool,
        const COPY_DST2: bool,
        const TEXTURE_BINDING2: bool,
        const STORAGE_BINDING2: bool,
        const RENDER_ATTACHMENT2: bool,
        VF: TextureFormatSRGB<F>,
        const ARRAY_LAYER_COUNT: u32,
        const BASE_ARRAY_LAYER: u32,
        const TEXTURE_DEPTH_OR_ARRAY_LAYERS: u32,
        const TEXTURE_MIP_LEVEL_COUNT: u32,
        const BASE_MIP_LEVEL: u32,
        const MIP_LEVEL_COUNT: u32,
    >(
        texture: &Texture<
            VF,
            DIMENSION,
            SAMPLE_COUNT,
            TEXTURE_DEPTH_OR_ARRAY_LAYERS,
            TEXTURE_MIP_LEVEL_COUNT,
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
        // descriptor.mipLevelCount must be > 0.
        const { assert!(MIP_LEVEL_COUNT > 0) };
        // descriptor.baseMipLevel + descriptor.mipLevelCount must be ≤ this.mipLevelCount.
        const { assert!(BASE_MIP_LEVEL + MIP_LEVEL_COUNT <= TEXTURE_MIP_LEVEL_COUNT) };
        // descriptor.arrayLayerCount must be > 0.
        const { assert!(ARRAY_LAYER_COUNT > 0) };
        // descriptor.baseArrayLayer + descriptor.arrayLayerCount must be ≤ the array layer count of this.
        const { assert!(BASE_ARRAY_LAYER + ARRAY_LAYER_COUNT <= TEXTURE_DEPTH_OR_ARRAY_LAYERS) };

        let externref = unsafe {
            create_texture_view(
                &texture.externref,
                label.as_ptr() as usize,
                label.len(),
                VF::to_srgb(),
                dimension,
                Self::usages(),
                aspect,
                BASE_MIP_LEVEL,
                MIP_LEVEL_COUNT,
                BASE_ARRAY_LAYER,
                ARRAY_LAYER_COUNT,
            )
        };
        return TextureView {
            externref,
            format: PhantomData,
            label,
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
    Texture::<BGRA8UNORM, 2, 4, 1, 1, false, false, true, false, true>::new(
        &device,
        300,
        300,
        String::from("testtexture"),
    )
    .create_view::<true, false, true, false, true, 1, 0, 1, 0>(
        String::from("testtextureview"),
        TextureViewDimension::d2,
        TextureAspect::all,
    );
}
