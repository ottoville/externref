use std::cell::Cell;

#[cfg(any(not(test), rust_analyzer))]
#[cfg(target_arch = "wasm32")]
use externref::externref;
use externref::Resource;

use crate::gpu::gpu::JSDevice;

pub enum TextureFormat {
    r8unorm,
    r8snorm,
    r8uint,
    r8sint,
    r16unorm,
    r16snorm,
    r16uint,
    r16sint,
    r16float,
    rg8unorm,
    rg8snorm,
    rg8uint,
    rg8sint,
    r32uint,
    r32sint,
    r32float,
    rg16unorm,
    rg16snorm,
    rg16uint,
    rg16sint,
    rg16float,
    rgba8unorm,
    rgba8unorm_srgb,
    rgba8snorm,
    rgba8uint,
    rgba8sint,
    bgra8unorm,
    bgra8unorm_srgb,
    rgb9e5ufloat,
    rgb10a2uint,
    rgb10a2unorm,
    rg11b10ufloat,
    rg32uint,
    rg32sint,
    rg32float,
    rgba16unorm,
    rgba16snorm,
    rgba16uint,
    rgba16sint,
    rgba16float,
    rgba32uint,
    rgba32sint,
    rgba32float,
    stencil8,
    depth16unorm,
    depth24plus,
    depth24plus_stencil8,
    depth32float,
    depth32float_stencil8,
    bc1_rgba_unorm,
    bc1_rgba_unorm_srgb,
    bc2_rgba_unorm,
    bc2_rgba_unorm_srgb,
    bc3_rgba_unorm,
    bc3_rgba_unorm_srgb,
    bc4_r_unorm,
    bc4_r_snorm,
    bc5_rg_unorm,
    bc5_rg_snorm,
    bc6h_rgb_ufloat,
    bc6h_rgb_float,
    bc7_rgba_unorm,
    bc7_rgba_unorm_srgb,
    etc2_rgb8unorm,
    etc2_rgb8unorm_srgb,
    etc2_rgb8a1unorm,
    etc2_rgb8a1unorm_srgb,
    etc2_rgba8unorm,
    etc2_rgba8unorm_srgb,
    eac_r11unorm,
    eac_r11snorm,
    eac_rg11unorm,
    eac_rg11snorm,
    astc_4x4_unorm,
    astc_4x4_unorm_srgb,
    astc_5x4_unorm,
    astc_5x4_unorm_srgb,
    astc_5x5_unorm,
    astc_5x5_unorm_srgb,
    astc_6x5_unorm,
    astc_6x5_unorm_srgb,
    astc_6x6_unorm,
    astc_6x6_unorm_srgb,
    astc_8x5_unorm,
    astc_8x5_unorm_srgb,
    astc_8x6_unorm,
    astc_8x6_unorm_srgb,
    astc_8x8_unorm,
    astc_8x8_unorm_srgb,
    astc_10x5_unorm,
    astc_10x5_unorm_srgb,
    astc_10x6_unorm,
    astc_10x6_unorm_srgb,
    astc_10x8_unorm,
    astc_10x8_unorm_srgb,
    astc_10x10_unorm,
    astc_10x10_unorm_srgb,
    astc_12x10_unorm,
    astc_12x10_unorm_srgb,
    astc_12x12_unorm,
    astc_12x12_unorm_srgb,
}
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
pub struct JSTextureView(());

#[cfg(test)]
pub unsafe fn create_texture_view(
    _texture: &Resource<JSTexture>,
    _label: *mut [usize; 3],
    _format: TextureFormat,
    _dimension: TextureViewDimension,
    _usage: u32,
    _aspect: TextureAspect,
    _baseMipLevel: u32,
    _mipLevelCount: u32,
    _baseArrayLayer: u32,
    _arrayLayerCount: u32,
) -> Resource<JSTextureView> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "texture")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_texture(
        device: &Resource<JSDevice>,
        width: usize,
        height: usize,
        depthOrArrayLayers: usize,
        label: *const usize,
        usages: u32,
        mipLevelCount: u32,
        sampleCount: u32,
        dimension: u32,
        format: TextureFormat,
        viewFormats: *const usize,
    ) -> Resource<JSTexture>;

    pub fn create_texture_view(
        texture: &Resource<JSTexture>,
        label: *mut [usize; 3],
        format: TextureFormat,
        dimension: TextureViewDimension,
        usage: u32,
        aspect: TextureAspect,
        baseMipLevel: u32,
        mipLevelCount: u32,
        baseArrayLayer: u32,
        arrayLayerCount: u32,
    ) -> Resource<JSTextureView>;
}

thread_local! {
    static LABEL:Cell<[usize; 3]> = const { Cell::new([0;3]) };
}

struct Texture {
    externref: Resource<JSTexture>,
}
impl Texture {
    pub fn create_view(
        &self,
        label: String,
        format: TextureFormat,
        dimension: TextureViewDimension,
        usage: u32,
        aspect: TextureAspect,
        baseMipLevel: u32,
        mipLevelCount: u32,
        baseArrayLayer: u32,
        arrayLayerCount: u32,
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
                baseMipLevel,
                mipLevelCount,
                baseArrayLayer,
                arrayLayerCount,
            )
        };
        return TextureView { externref };
    }
}

struct TextureView {
    externref: Resource<JSTextureView>,
}
