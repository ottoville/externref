use externref::externref;
use externref::Resource;
use std::{marker::PhantomData, num::NonZeroU32};

use crate::{
    device::JSDevice,
    texture::{
        texture_formats::{TextureFormat, TextureFormatSRGB},
        texture_view::TextureView,
    },
};

pub enum TextureDimension {
    d1,
    d2,
    d3,
}
pub enum TextureViewDimension {
    d1,
    d2,
    array_2d,
    cube,
    cube_array,
    d3,
}
pub enum TextureAspect {
    all,
    stencil_only,
    depth_only,
}
pub struct JSTexture(());

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn create_texture(
    _device: &Resource<JSDevice>,
    _width: usize,
    _height: usize,
    _depth_or_array_layers: usize,
    _label_ptr: usize,
    _label_len: usize,
    _usages: u32,
    _mip_level_count: u32,
    _sample_count: u32,
    _dimension: u32,
    _format: u32,
    _viewformats_ptr: usize,
    _viewformats_len: usize,
) -> Resource<JSTexture> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "device")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_texture(
        device: &Resource<JSDevice>,
        width: usize,
        height: usize,
        depthOrArrayLayers: usize,
        label_ptr: usize,
        label_len: usize,
        usages: u32,
        mipLevelCount: u32,
        sampleCount: u32,
        dimension: u32,
        format: u32,
        viewformats_ptr: usize,
        viewformats_len: usize,
    ) -> Resource<JSTexture>;
}

pub const fn usages_from_bools<
    const COPY_SRC: bool,
    const COPY_DST: bool,
    const TEXTURE_BINDING: bool,
    const STORAGE_BINDING: bool,
    const RENDER_ATTACHMENT: bool,
>() -> u32 {
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

pub struct Texture<
    F: TextureFormat,
    const DIMENSION: u32,
    const SAMPLE_COUNT: u32,
    const COPY_SRC: bool = false,
    const COPY_DST: bool = false,
    const TEXTURE_BINDING: bool = false,
    const STORAGE_BINDING: bool = false,
    const RENDER_ATTACHMENT: bool = false,
    const SRGB_MULTIVIEW: bool = false,
> {
    pub externref: Resource<JSTexture>,
    label: String,
    format: PhantomData<F>,
}

pub trait TextureDimensionTrait {}

// when dimension is 1 enforce sample count 1 and no render attachment
impl<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const SRGB_MULTIVIEW: bool,
    > TextureDimensionTrait
    for Texture<
        F,
        1,
        1,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        false,
        SRGB_MULTIVIEW,
    >
{
}

// 2 dimension
impl<
        F: TextureFormat,
        const SAMPLE_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    > TextureDimensionTrait
    for Texture<
        F,
        2,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
{
}
// 3 dimension

impl<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
    > TextureDimensionTrait
    for Texture<F, 3, 1, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, RENDER_ATTACHMENT>
{
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
        const SRGB_MULTIVIEW: bool,
    >
    Texture<
        F,
        DIMENSION,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
where
    Self: TextureDimensionTrait,
{
    pub const fn usages() -> u32 {
        return usages_from_bools::<
            COPY_SRC,
            COPY_DST,
            TEXTURE_BINDING,
            STORAGE_BINDING,
            RENDER_ATTACHMENT,
        >();
    }
    /// # Creates new texture
    /// ## Should panic, 4 dimension texture does not exist
    /// ```compile_fail
    /// use crate::webgpu::texture::{texture::Texture, texture_formats::BGRA8UNORM};
    /// use externref::{ExternRef, Resource};
    /// let device = unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }; 
    /// let texture = Texture::<BGRA8UNORM, 4, 1, false, false, true, false, true>::new(
    ///     &device,
    ///    300,
    ///    300,
    ///    1,
    ///    String::from("test"),
    ///    1,
    /// );
    /// ```
    pub fn new(
        device: &Resource<JSDevice>,
        width: usize,
        height: usize,
        depth_or_array_layers: usize,
        label: String,
        mip_level_count: u32,
    ) -> Self {
        let externref = unsafe {
            create_texture(
                device,
                width,
                height,
                depth_or_array_layers,
                label.as_ptr() as usize,
                label.len(),
                Self::usages(),
                mip_level_count,
                SAMPLE_COUNT,
                DIMENSION,
                F::to_number(),
                0,
                0,
            )
        };
        Texture {
            label,
            externref,
            format: PhantomData,
        }
    }
    pub fn new_with_srgb_multiview<VF: TextureFormat>(
        device: &Resource<JSDevice>,
        width: usize,
        height: usize,
        depth_or_array_layers: usize,
        label: String,
        mip_level_count: u32,
    ) -> Texture<
        F,
        DIMENSION,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        true,
    >
    where
        F: TextureFormatSRGB<VF>,
    {
        let variants = [F::to_number(), F::to_srgb()];
        let externref = unsafe {
            create_texture(
                device,
                width,
                height,
                depth_or_array_layers,
                label.as_ptr() as usize,
                label.len(),
                Self::usages(),
                mip_level_count,
                SAMPLE_COUNT,
                DIMENSION,
                F::to_number(),
                variants.as_ptr() as usize,
                variants.len(),
            )
        };
        Texture {
            label,
            externref,
            format: PhantomData,
        }
    }
    pub fn create_view<
        const COPY_SRC2: bool,
        const COPY_DST2: bool,
        const TEXTURE_BINDING2: bool,
        const STORAGE_BINDING2: bool,
        const RENDER_ATTACHMENT2: bool,
    >(
        &self,
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
        COPY_SRC2,
        COPY_DST2,
        TEXTURE_BINDING2,
        STORAGE_BINDING2,
        RENDER_ATTACHMENT2,
    > {
        // TODO: panic on compile of view usage is not subset of texture usage

        let view_usages = usages_from_bools::<
            COPY_SRC2,
            COPY_DST2,
            TEXTURE_BINDING2,
            STORAGE_BINDING2,
            RENDER_ATTACHMENT2,
        >();
        debug_assert!(
            Self::usages() & view_usages == view_usages,
            "texture view usages of {} is not subset of usages of {}",
            label,
            self.label
        );
        return TextureView::new(
            self,
            label,
            dimension,
            aspect,
            base_mip_level,
            mip_level_count,
            base_array_layer,
            array_layer_count,
        );
    }
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
    Texture<
        F,
        DIMENSION,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        true,
    >
{
    pub fn create_srgb_view<
        const COPY_SRC2: bool,
        const COPY_DST2: bool,
        const TEXTURE_BINDING2: bool,
        const STORAGE_BINDING2: bool,
        const RENDER_ATTACHMENT2: bool,
        VF: TextureFormat,
    >(
        &self,
        label: String,
        dimension: TextureViewDimension,
        aspect: TextureAspect,
        base_mip_level: u32,
        mip_level_count: NonZeroU32,
        base_array_layer: u32,
        array_layer_count: NonZeroU32,
    ) -> TextureView<
        VF,
        DIMENSION,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
    >
    where
        F: TextureFormatSRGB<VF>,
        Self: TextureDimensionTrait,
    {
        let view_usages = usages_from_bools::<
            COPY_SRC2,
            COPY_DST2,
            TEXTURE_BINDING2,
            STORAGE_BINDING2,
            RENDER_ATTACHMENT2,
        >();
        debug_assert!(
            Self::usages() & view_usages == view_usages,
            "texture view usages of {} is not subset of usages of {}",
            label,
            self.label
        );
        return TextureView::<
            VF,
            DIMENSION,
            SAMPLE_COUNT,
            COPY_SRC,
            COPY_DST,
            TEXTURE_BINDING,
            STORAGE_BINDING,
            RENDER_ATTACHMENT,
        >::new_srgb(
            self,
            label,
            dimension,
            aspect,
            base_mip_level,
            mip_level_count,
            base_array_layer,
            array_layer_count,
        );
    }
}
#[cfg(test)]
#[test]
fn test_texture() {
    use crate::texture::texture_formats::BGRA8UNORM;
    use externref::ExternRef;
    let device = unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) };
    let texture = Texture::<BGRA8UNORM, 2, 4, false, false, true, false, true>::new(
        &device,
        300,
        300,
        1,
        String::from("test"),
        1,
    );
}
