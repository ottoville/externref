#[cfg(any(not(test), rust_analyzer))]
#[cfg(target_arch = "wasm32")]
use externref::externref;
use externref::Resource;

use crate::gpu::texture::texture::JSTexture;

#[cfg(test)]
pub unsafe fn create_texture_view(
    _texture: &Resource<JSTexture>,
    _label_ptr: usize,
    _label_len: usize,
    _format: u32,
    _dimension: super::texture::TextureViewDimension,
    _usage: u32,
    _aspect: super::texture::TextureAspect,
    _base_mip_level: u32,
    _mip_level_count: u32,
    _base_array_layer: u32,
    _array_layer_count: u32,
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
        label_ptr: usize,
        label_len: usize,
        format: u32,
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
