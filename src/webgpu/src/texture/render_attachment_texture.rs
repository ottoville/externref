use externref::Resource;

use crate::texture::{
    texture_formats::{TextureFormat, TFORMAT},
    texture_view::{JSTextureView, TextureView},
};

pub trait RenderAttachmentFormat: TextureFormat {}
impl<const U: u32, const MULTISAMPLING: bool> RenderAttachmentFormat
    for TFORMAT<U, true, false, MULTISAMPLING>
{
}

pub trait SampledTextureFormat: TextureFormat {}

impl<const U: u32> SampledTextureFormat for TFORMAT<U, true, false, true> {}

/*
If descriptor.usage includes the RENDER_ATTACHMENT bit:
descriptor.format must be a renderable format.
descriptor.dimension must be either "2d" or "3d".
*/
/// # Render attachment texture view
/// ```
/// use crate::webgpu::texture::{
///                                 texture::{Texture,TextureAspect,TextureViewDimension},
///                                 render_attachment_texture::RenderAttachmentTextureMultiSampled,
///                                 texture_formats::BGRA8UNORM
///                             };
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// unsafe {
/// let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
/// let multisampled_textureview: Box<dyn RenderAttachmentTextureMultiSampled> = Box::new(
///        Texture::<BGRA8UNORM, 2, 4, false, false, true, false, true>::new(
///            &device,
///            300,
///            300,
///            1,
///            String::from("diffuseTexture"),
///            1,
///        )
///        .create_view::<false, false, true, false, true>(
///            String::from("test"),
///            TextureViewDimension::d2,
///            TextureAspect::all,
///            1,
///            NonZeroU32::new_unchecked(1),
///            1,
///            NonZeroU32::new_unchecked(1),
///        )
///    );
/// }
/// ```
/// ## Should panic, 3 sample count texture does not exist
/// ```compile_fail
/// use crate::webgpu::texture::{
///                                 texture::{Texture,TextureAspect,TextureViewDimension},
///                                 render_attachment_texture::RenderAttachmentTextureMultiSampled,
///                                 texture_formats::BGRA8UNORM
///                             };
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// unsafe {
/// let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
/// let multisampled_textureview: Box<dyn RenderAttachmentTextureMultiSampled> = Box::new(
///        Texture::<BGRA8UNORM, 2, 3, false, false, true, false, true>::new(
///            &device,
///            300,
///            300,
///            1,
///            String::from("diffuseTexture"),
///            1,
///        )
///        .create_view::<false, false, true, false, true>(
///            String::from("test"),
///            TextureViewDimension::d2,
///            TextureAspect::all,
///            1,
///            NonZeroU32::new_unchecked(1),
///            1,
///            NonZeroU32::new_unchecked(1),
///        )
///    );
/// }
/// ```
/// ## Should panic, 1d and 3d texture only supports 1 sample count
/// ```compile_fail
/// use crate::webgpu::texture::{
///                                 texture::{Texture,TextureAspect,TextureViewDimension},
///                                 render_attachment_texture::RenderAttachmentTextureMultiSampled,
///                                 texture_formats::BGRA8UNORM
///                             };
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// unsafe {
/// let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
/// let multisampled_textureview_1d: Box<dyn RenderAttachmentTextureMultiSampled> = Box::new(
///        Texture::<BGRA8UNORM, 1, 2, false, false, true, false, true>::new(
///            &device,
///            300,
///            300,
///            1,
///            String::from("diffuseTexture"),
///            1,
///        )
///        .create_view::<false, false, true, false, true>(
///            String::from("test"),
///            TextureViewDimension::d2,
///            TextureAspect::all,
///            1,
///            NonZeroU32::new_unchecked(1),
///            1,
///            NonZeroU32::new_unchecked(1),
///        )
///    );
/// }
/// let multisampled_textureview3d: Box<dyn RenderAttachmentTextureMultiSampled> = Box::new(
///        Texture::<BGRA8UNORM, 3, 2, false, false, true, false, true>::new(
///            &device,
///            300,
///            300,
///            1,
///            String::from("diffuseTexture"),
///            1,
///        )
///        .create_view::<false, false, true, false, true>(
///            String::from("test"),
///            TextureViewDimension::d2,
///            TextureAspect::all,
///            1,
///            NonZeroU32::new_unchecked(1),
///            1,
///            NonZeroU32::new_unchecked(1),
///        )
///    );
/// }
/// ```
/// ## Should panic, texture format does not support multisampling
/// ```compile_fail
/// use crate::webgpu::texture::{
///                                 texture::{Texture,TextureAspect,TextureViewDimension},
///                                 render_attachment_texture::RenderAttachmentTextureMultiSampled,
///                                 texture_formats::R32SINT
///                             };
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// unsafe {
/// let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
/// let multisampled_textureview: Box<dyn RenderAttachmentTextureMultiSampled> = Box::new(
///        Texture::<R32SINT, 2, 4, false, false, false, false, true>::new(
///            &device,
///            300,
///            300,
///            1,
///            String::from("diffuseTexture"),
///            1,
///        )
///        .create_view::<false, false, true, false, true>(
///            String::from("test"),
///            TextureViewDimension::d2,
///            TextureAspect::all,
///            1,
///            NonZeroU32::new_unchecked(1),
///            1,
///            NonZeroU32::new_unchecked(1),
///        )
///    );
/// }
/// ```
/// ## Should panic, if samplecount > 1, descriptor.usage must include the RENDER_ATTACHMENT bit AND must not include the STORAGE_BINDING bit.
/// ```compile_fail
/// use crate::webgpu::texture::{
///                                 texture::{Texture,TextureAspect,TextureViewDimension},
///                                 texture_formats::BGRA8UNORM,
///                                 valid_texture::ValidTexture
///                             };
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// unsafe {
/// let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
/// let multisampled_texture_without_render_bit: Box<dyn ValidTexture> = Box::new(
///        Texture::<BGRA8UNORM, 2, 4, false, false, true, false, false>::new(
///            &device,
///            300,
///            300,
///            1,
///            String::from("diffuseTexture"),
///            1,
///        )
///    );
/// }
/// let multisampled_texture_with_storage_bit: Box<dyn ValidTexture> = Box::new(
///        Texture::<BGRA8UNORM, 2, 4, false, false, true, true, true>::new(
///            &device,
///            300,
///            300,
///            1,
///            String::from("diffuseTexture"),
///            1,
///        )
///    );
/// }
/// ```
/// ## Should panic, If descriptor.usage includes the RENDER_ATTACHMENT bit: descriptor.format must be a renderable format.
/// ```compile_fail
/// use crate::webgpu::texture::{
///                                 texture::{Texture,TextureAspect,TextureViewDimension},
///                                 render_attachment_texture::RenderAttachmentTexture,
///                                 texture_formats::RGB9E5UFLOAT
///                             };
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// unsafe {
/// let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
/// let renderable_textureview: Box<dyn RenderAttachmentTexture> = Box::new(
///        Texture::<RGB9E5UFLOAT, 2, 1, false, false, false, false, true>::new(
///            &device,
///            300,
///            300,
///            1,
///            String::from("diffuseTexture"),
///            1,
///        )
///        .create_view::<false, false, true, false, true>(
///            String::from("test"),
///            TextureViewDimension::d2,
///            TextureAspect::all,
///            1,
///            NonZeroU32::new_unchecked(1),
///            1,
///            NonZeroU32::new_unchecked(1),
///        )
///    );
/// }
/// ```
/// ## Should panic, If descriptor.usage includes the RENDER_ATTACHMENT bit: descriptor.dimension must be either "2d" or "3d".
/// ```compile_fail
/// use crate::webgpu::texture::{
///                                 texture::{Texture,TextureAspect,TextureViewDimension},
///                                 render_attachment_texture::RenderAttachmentTexture,
///                                 texture_formats::BGRA8UNORM
///                             };
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// unsafe {
/// let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
/// let renderable_textureview: Box<dyn RenderAttachmentTexture> = Box::new(
///        Texture::<BGRA8UNORM, 1, 1, false, false, false, false, true>::new(
///            &device,
///            300,
///            300,
///            1,
///            String::from("diffuseTexture"),
///            1,
///        )
///        .create_view::<false, false, true, false, true>(
///            String::from("test"),
///            TextureViewDimension::d2,
///            TextureAspect::all,
///            1,
///            NonZeroU32::new_unchecked(1),
///            1,
///            NonZeroU32::new_unchecked(1),
///        )
///    );
/// }
/// ```
pub trait RenderAttachmentTexture {
    fn to_number(&self) -> u32;

    fn get_attachment(&mut self) -> &Resource<JSTextureView>;
}
impl<
        F: RenderAttachmentFormat,
        const DIMENSION: u32,
        const SAMPLE_COUNT: u32,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
    > RenderAttachmentTexture
    for TextureView<F, DIMENSION, SAMPLE_COUNT, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, true>
{
    fn to_number(&self) -> u32 {
        F::to_number()
    }
    
    fn get_attachment(&mut self) -> &Resource<JSTextureView> {
        &self.externref
    }
}

pub trait RenderAttachmentTextureMultiSampled: RenderAttachmentTexture {}
// 2-dimensioned texture, multisampled
// If descriptor.sampleCount > 1:
// descriptor.usage must not include the STORAGE_BINDING bit.
// descriptor.usage must include the RENDER_ATTACHMENT bit.
// https://www.w3.org/TR/webgpu/#abstract-opdef-validating-gputexturedescriptor
impl<
        F: SampledTextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
    > RenderAttachmentTextureMultiSampled
    for TextureView<F, 2, 4, COPY_SRC, COPY_DST, TEXTURE_BINDING, false, true>
where
    TextureView<F, 2, 4, COPY_SRC, COPY_DST, TEXTURE_BINDING, false, true>: RenderAttachmentTexture,
{
}
pub trait RenderAttachmentTextureSingleSampled: RenderAttachmentTexture {}
// 2-dimensioned texture, singlesampled
impl<
        F: RenderAttachmentFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
    > RenderAttachmentTextureSingleSampled
    for TextureView<F, 2, 1, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, true>
{
}
