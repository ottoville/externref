use std::{cell::Cell, marker::PhantomData};

#[cfg(any(not(test), rust_analyzer))]
#[cfg(target_arch = "wasm32")]
use externref::externref;
use externref::Resource;

use crate::gpu::{
    gpu::JSDevice,
    texture::{
        texture_formats::{TextureFormat, TextureFormatTrait},
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
    _format: TextureFormat,
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
        format: TextureFormat,
        viewformats_ptr: usize,
        viewformats_len: usize,
    ) -> Resource<JSTexture>;

}

thread_local! {
    static LABEL:Cell<[usize; 3]> = const { Cell::new([0;3]) };
}

pub struct Texture<
    F: TextureFormatTrait,
    VF,
    const DIMENSION: u32,
    const COPY_SRC: bool = false,
    const COPY_DST: bool = false,
    const TEXTURE_BINDING: bool = false,
    const STORAGE_BINDING: bool = false,
    const RENDER_ATTACHMENT: bool = false,
> {
    externref: Resource<JSTexture>,
    label: String,
    format: PhantomData<F>,
    view_formats: PhantomData<VF>,
}

pub trait TextureDimensionTrait {}

impl<
        F: TextureFormatTrait,
        VF,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
    > TextureDimensionTrait
    for Texture<F, VF, 1, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, RENDER_ATTACHMENT>
{
}
impl<
        F: TextureFormatTrait,
        VF,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
    > TextureDimensionTrait
    for Texture<F, VF, 2, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, RENDER_ATTACHMENT>
{
}

impl<
        F: TextureFormatTrait,
        VF,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
    > TextureDimensionTrait
    for Texture<F, VF, 3, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, RENDER_ATTACHMENT>
{
}
impl<
        F: TextureFormatTrait,
        VF,
        const DIMENSION: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
    >
    Texture<
        F,
        VF,
        DIMENSION,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
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
    pub fn new<const N: usize>(
        device: &Resource<JSDevice>,
        width: usize,
        height: usize,
        depth_or_array_layers: usize,
        label: String,
        mip_level_count: u32,
        sample_count: u32,
        view_formats: [VF; N],
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
                sample_count,
                DIMENSION,
                F::to_number(),
                view_formats.as_ptr() as usize,
                N,
            )
        };
        Texture {
            label,
            externref,
            format: PhantomData,
            view_formats: PhantomData,
        }
    }
    pub fn create_view(
        &self,
        label: String,
        format: TextureFormat,
        dimension: TextureViewDimension,
        usage: u32,
        aspect: TextureAspect,
        base_mip_level: u32,
        mip_level_count: u32,
        base_array_layer: u32,
        array_layer_count: u32,
    ) -> TextureView {
        LABEL.set([label.as_ptr() as usize, label.len(), label.capacity()]);
        let label_ptr = LABEL.with(|l| l.as_ptr());
        let externref = unsafe {
            create_texture_view(
                &self.externref,
                label_ptr,
                format,
                dimension,
                usage,
                aspect,
                base_mip_level,
                mip_level_count,
                base_array_layer,
                array_layer_count,
            )
        };
        return TextureView { externref };
    }
}
