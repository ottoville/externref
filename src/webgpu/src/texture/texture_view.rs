use std::{marker::PhantomData, rc::Rc};
use externref::Resource;

use crate::texture::{
    texture::{usages_from_bools, JSTexture, Texture, TextureAspect, TextureViewDimension},
    texture_formats::{TextureFormat, TextureFormatSRGB},
    valid_texture::ValidTexture,
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
    pub texture: Rc<dyn ValidTexture>,
}
impl<
        F: TextureFormat + Sync + Send,
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
        texture: Rc<
            Texture<
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
    >
    where
        Texture<
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
        >: ValidTexture + 'static,
    {
        // descriptor.mipLevelCount must be > 0.
        const { assert!(MIP_LEVEL_COUNT > 0) };
        // descriptor.baseMipLevel + descriptor.mipLevelCount must be ≤ this.mipLevelCount.
        const { assert!(BASE_MIP_LEVEL + MIP_LEVEL_COUNT <= TEXTURE_MIP_LEVEL_COUNT) };
        // descriptor.arrayLayerCount must be > 0.
        const { assert!(ARRAY_LAYER_COUNT > 0) };
        // descriptor.baseArrayLayer + descriptor.arrayLayerCount must be ≤ the array layer count of this.
        const { assert!(BASE_ARRAY_LAYER + ARRAY_LAYER_COUNT <= TEXTURE_DEPTH_OR_ARRAY_LAYERS) };

        let texture_usages = usages_from_bools::<
            COPY_SRC2,
            COPY_DST2,
            TEXTURE_BINDING2,
            STORAGE_BINDING2,
            RENDER_ATTACHMENT2,
        >();
        debug_assert!(
            Self::usages() & texture_usages == Self::usages(),
            "texture view usages of {} ({}) is not subset of usages of {} ({})",
            label,
            Self::usages(),
            match &texture.label {
                Some(l) => l.clone(),
                None => String::from("unlabeled_texture"),
            },
            texture_usages
        );

        let externref = unsafe {
            create_texture_view(
                &texture.externref.borrow(),
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
            texture,
        };
    }
    pub fn new_srgb<
        const COPY_SRC2: bool,
        const COPY_DST2: bool,
        const TEXTURE_BINDING2: bool,
        const STORAGE_BINDING2: bool,
        const RENDER_ATTACHMENT2: bool,
        VF: TextureFormatSRGB<F> + Send + Sync,
        const ARRAY_LAYER_COUNT: u32,
        const BASE_ARRAY_LAYER: u32,
        const TEXTURE_DEPTH_OR_ARRAY_LAYERS: u32,
        const TEXTURE_MIP_LEVEL_COUNT: u32,
        const BASE_MIP_LEVEL: u32,
        const MIP_LEVEL_COUNT: u32,
    >(
        texture: Rc<
            Texture<
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
    >
    where
        Texture<
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
        >: ValidTexture + 'static,
    {
        // descriptor.mipLevelCount must be > 0.
        const { assert!(MIP_LEVEL_COUNT > 0) };
        // descriptor.baseMipLevel + descriptor.mipLevelCount must be ≤ this.mipLevelCount.
        const { assert!(BASE_MIP_LEVEL + MIP_LEVEL_COUNT <= TEXTURE_MIP_LEVEL_COUNT) };
        // descriptor.arrayLayerCount must be > 0.
        const { assert!(ARRAY_LAYER_COUNT > 0) };
        // descriptor.baseArrayLayer + descriptor.arrayLayerCount must be ≤ the array layer count of this.
        const { assert!(BASE_ARRAY_LAYER + ARRAY_LAYER_COUNT <= TEXTURE_DEPTH_OR_ARRAY_LAYERS) };

        let texture_usages = usages_from_bools::<
            COPY_SRC2,
            COPY_DST2,
            TEXTURE_BINDING2,
            STORAGE_BINDING2,
            RENDER_ATTACHMENT2,
        >();
        debug_assert!(
            Self::usages() & texture_usages == texture_usages,
            "texture view usages of {} ({}) is not subset of usages of {} ({})",
            label,
            Self::usages(),
            match &texture.label {
                Some(l) => l.clone(),
                None => String::from("unlabeled_texture"),
            },
            texture_usages
        );

        let externref = unsafe {
            create_texture_view(
                &texture.externref.borrow(),
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
            texture,
        };
    }
}

#[cfg(test)]
#[should_panic(
    expected = "texture view usages of testtextureview (21) is not subset of usages of testtexture (20)"
)]
#[test]
fn texture_view_usages() {
    use crate::texture::texture_formats::BGRA8UNORM;
    use externref::ExternRef;
    use std::num::NonZeroU32;
    let device = unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) };
    let texture = Rc::new(Texture::<
        BGRA8UNORM,
        2,
        4,
        1,
        1,
        false,
        false,
        true,
        false,
        true,
    >::new(
        &device,
        unsafe { NonZeroU32::new_unchecked(300) },
        unsafe { NonZeroU32::new_unchecked(300) },
        String::from("testtexture"),
    ));

    TextureView::<_, _, _, true, false, true, false, true>::new::<_, _, _, _, _, _, 1, 0, _, _, 0, 1>(
        texture,
        String::from("testtextureview"),
        TextureViewDimension::D2,
        TextureAspect::All,
    );
}

#[cfg(test)]
#[test]
fn test_create_texture_view() {
    use crate::texture::{
        texture::{Texture, TextureAspect, TextureViewDimension},
        texture_formats::BGRA8UNORM,
    };
    use externref::{ExternRef, Resource};
    use std::num::NonZeroU32;
    unsafe {
        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
        let texture = Rc::new(Texture::<
            BGRA8UNORM,
            1,
            1,
            1,
            1,
            false,
            false,
            true,
            false,
            false,
        >::new(
            &device,
            NonZeroU32::new_unchecked(300),
            NonZeroU32::new_unchecked(300),
            String::from("diffuseTexture"),
        ));
        TextureView::<_, _, _, false, false, true, false, false>::new::<
            _,
            _,
            _,
            _,
            _,
            _,
            1,
            0,
            _,
            _,
            0,
            1,
        >(
            texture,
            String::from("test"),
            TextureViewDimension::D2,
            TextureAspect::All,
        );
    }
}
