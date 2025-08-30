use std::marker::PhantomData;

#[cfg(any(not(test), rust_analyzer))]
#[cfg(target_arch = "wasm32")]
use externref::externref;
use externref::Resource;

use crate::gpu::{
    gpu::JSDevice,
    texture::{
        texture_formats::{TextureFormat, TextureFormatSRGB},
        texture_view::{create_texture_view, TextureView},
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

#[cfg(test)]
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
    externref: Resource<JSTexture>,
    label: String,
    format: PhantomData<F>,
}

pub trait TextureDimensionTrait {}

impl<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
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
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
{
}
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
    pub fn create_view(
        &self,
        label: String,
        dimension: TextureViewDimension,
        usage: u32,
        aspect: TextureAspect,
        base_mip_level: u32,
        mip_level_count: u32,
        base_array_layer: u32,
        array_layer_count: u32,
    ) -> TextureView<F> {
        let externref = unsafe {
            create_texture_view(
                &self.externref,
                label.as_ptr() as usize,
                label.len(),
                F::to_number(),
                dimension,
                usage,
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
    pub fn create_srgb_view<VF: TextureFormat>(
        &self,
        label: String,
        dimension: TextureViewDimension,
        usage: u32,
        aspect: TextureAspect,
        base_mip_level: u32,
        mip_level_count: u32,
        base_array_layer: u32,
        array_layer_count: u32,
    ) -> TextureView<VF>
    where
        F: TextureFormatSRGB<VF>,
    {
        let externref = unsafe {
            create_texture_view(
                &self.externref,
                label.as_ptr() as usize,
                label.len(),
                F::to_srgb(),
                dimension,
                usage,
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
