#[cfg(any(not(test), rust_analyzer))]
#[cfg(target_arch = "wasm32")]
use externref::externref;
use externref::Resource;

use crate::gpu::texture::texture::{JSTexture};

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
    pub fn create_texture_view(
        texture: &Resource<JSTexture>,
        label: *mut [usize; 3],
        format: super::texture_formats::TextureFormat,
        dimension: super::texture::TextureViewDimension,
        usage: u32,
        aspect: super::texture::TextureAspect,
        baseMipLevel: u32,
        mipLevelCount: u32,
        baseArrayLayer: u32,
        arrayLayerCount: u32,
    ) -> Resource<JSTextureView>;
}
pub struct JSTextureView(());

pub struct TextureView {
    pub externref: Resource<JSTextureView>,
}
