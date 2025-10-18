use std::num::{NonZero, NonZeroU32};

use externref::Resource;

use crate::{
    device::JSDevice,
    texture::{
        texture_formats::{TextureFormat, TFORMAT},
        texture_view::{JSTextureView, TextureView},
    },
};

pub trait RenderAttachmentFormat: TextureFormat {}
impl<const U: u32, const DEPTH: bool, const MULTISAMPLING: bool> RenderAttachmentFormat
    for TFORMAT<U, true, DEPTH, MULTISAMPLING>
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
/// use crate::webgpu::texture::texture_view::TextureView;
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// use std::rc::Rc;
/// use std::cell::RefCell;
/// unsafe {
///     let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
///     let texture = Rc::new(Texture::<BGRA8UNORM, 2, 4,1,1, false, false, true, false, true>::new(
///         &device,
///         NonZeroU32::new_unchecked(300),
///         NonZeroU32::new_unchecked(300),
///         String::from("diffuseTexture"),
///     ));
///     let multisampled_textureview: Rc<RefCell<dyn RenderAttachmentTextureMultiSampled>> = TextureView::<_, _, _, false, false, true, false, true>::new::<_, _, _, _, _, _, 1, 0, _, _, 0, 1>(
///         texture,
///         String::from("test"),
///         TextureViewDimension::D2,
///         TextureAspect::All,
///     );
/// }
/// ```
/// ## Should panic, 3 sample count texture does not exist
/// ```compile_fail
/// use crate::webgpu::texture::{
///                                 texture::{Texture,TextureAspect,TextureViewDimension},
///                                 render_attachment_texture::RenderAttachmentTextureMultiSampled,
///                                 texture_formats::BGRA8UNORM
///                             };
/// use crate::webgpu::texture::texture_view::TextureView;
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// use std::rc::Rc;
/// use std::cell::RefCell;
///
/// unsafe {
///     let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
///     let texture = Rc::new(Texture::<BGRA8UNORM, 2, 3,1,1, false, false, true, false, true>::new(
///         &device,
///         NonZeroU32::new_unchecked(300),
///         NonZeroU32::new_unchecked(300),
///         String::from("diffuseTexture"),
///     ));
///     let multisampled_textureview: Rc<RefCell<dyn RenderAttachmentTextureMultiSampled>> = TextureView::<_, _, _, false, false, true, false, true>::new::<_, _, _, _, _, _, 1, 0, _, _, 0, 1>(
///         texture,
///         String::from("test"),
///         TextureViewDimension::D2,
///         TextureAspect::All,
///     );
/// }
/// ```
/// ## 1d texture, should compile
/// ```
/// use crate::webgpu::texture::{
///                                 texture::{Texture,TextureAspect,TextureViewDimension},
///                                 render_attachment_texture::RenderAttachmentTextureMultiSampled,
///                                 texture_formats::BGRA8UNORM
///                             };
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// use std::rc::Rc;
/// use crate::webgpu::texture::texture_view::TextureView;
///
/// unsafe {
///        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
///        let texture = Rc::new(Texture::<BGRA8UNORM, 1, 1,1,1, false, false, true, false, false>::new(
///            &device,
///            NonZeroU32::new_unchecked(300),
///            NonZeroU32::new_unchecked(300),
///            String::from("diffuseTexture"),
///        ));
///       TextureView::<_, _, _, false, false, true, false, false>::new::<_, _, _, _, _, _, 1, 0, _, _, 0, 1>(
///            texture,
///            String::from("test"),
///            TextureViewDimension::D2,
///            TextureAspect::All,
///        );
/// }
/// ```
/// ## Should panic, Same example as above but with 4 sample count, 1d texture only supports 1 sample count
/// ```compile_fail
/// use crate::webgpu::texture::{
///                                 texture::{Texture,TextureAspect,TextureViewDimension},
///                                 render_attachment_texture::RenderAttachmentTextureMultiSampled,
///                                 texture_formats::BGRA8UNORM
///                             };
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// use std::rc::Rc;
/// use crate::webgpu::texture::texture_view::TextureView;
///
/// unsafe {
///        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
///        let texture = Rc::new(Texture::<BGRA8UNORM, 1, 4,1,1, false, false, true, false, false>::new(
///            &device,
///            NonZeroU32::new_unchecked(300),
///            NonZeroU32::new_unchecked(300),
///            String::from("diffuseTexture"),
///        ));
///       TextureView::<_, _, _, false, false, true, false, false>::new::<_, _, _, _, _, _, 1, 0, _, _, 0, 1>(
///            texture,
///            String::from("test"),
///            TextureViewDimension::D2,
///            TextureAspect::All,
///        );
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
/// use std::rc::Rc;
/// use std::cell::RefCell;
/// use crate::webgpu::texture::texture_view::TextureView;
///
/// unsafe {
///        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
///        let texture = Rc::new(Texture::<R32SINT, 2, 4,1,1, false, false, false, false, true>::new(
///            &device,
///            NonZeroU32::new_unchecked(300),
///            NonZeroU32::new_unchecked(300),
///            String::from("diffuseTexture"),
///        ));
///         let multisampled_textureview: Rc<RefCell<dyn RenderAttachmentTextureMultiSampled>> =
///             TextureView::<_, _, _, false, false, true, false, true>::new::<_, _, _, _, _, _, 1, 0, _, _, 0, 1>(
///             texture,
///             String::from("test"),
///             TextureViewDimension::D2,
///             TextureAspect::All,
///         );
/// }
/// ```
/// ## Should panic, if samplecount > 1, descriptor.usage must include the RENDER_ATTACHMENT bit AND must not include the STORAGE_BINDING bit.
/// ```compile_fail
/// use crate::webgpu::texture::{
///                                 texture::{Texture,TextureViewDimension},
///                                 texture_formats::BGRA8UNORM,
///                                 valid_texture::ValidTexture
///                             };
/// use externref::{ExternRef, Resource};
/// use std::num::{NonZeroU32, NonZeroUsize};
/// use std::cell::RefCell;
/// unsafe {
///     let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
///     let multisampled_texture_without_render_bit: Rc<RefCell<dyn ValidTexture>> =
///        Texture::<BGRA8UNORM, 2, 4,1,1, false, false, true, false, false>::new(
///            &device,
///            NonZeroU32::new_unchecked(300),
///            NonZeroU32::new_unchecked(300),
///            String::from("diffuseTexture"),
///        );
/// let multisampled_texture_with_storage_bit: Rc<RefCell<dyn ValidTexture>> =
///        Texture::<BGRA8UNORM, 2, 4,1,1, false, false, true, true, true>::new(
///            &device,
///            NonZeroU32::new_unchecked(300),
///            NonZeroU32::new_unchecked(300),
///            String::from("diffuseTexture"),
///        );
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
/// use std::rc::Rc;
/// use crate::webgpu::texture::texture_view::TextureView;
/// use std::cell::RefCell;
///
/// unsafe {
///    let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
///        let texture = Rc::new(Texture::<RGB9E5UFLOAT, 2, 1,1,1, false, false, false, false, true>::new(
///            &device,
///            NonZeroU32::new_unchecked(300),
///            NonZeroU32::new_unchecked(300),
///            String::from("diffuseTexture"),
///        ));
///    let renderable_textureview: Rc<RefCell<dyn RenderAttachmentTexture>> =
///        TextureView::<_, _, _, false, false, false, false, true>::new::<_, _, _, _, _, _, 1, 0, _, _, 0, 1>(
///            texture,
///            String::from("test"),
///            TextureViewDimension::D2,
///            TextureAspect::All,
///        );
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
/// use std::rc::Rc;
/// use std::cell::RefCell;
/// use crate::webgpu::texture::texture_view::TextureView;
///
/// unsafe {
///     let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
///     let texture = Rc::new(Texture::<BGRA8UNORM, 1, 1,1,1, false, false, false, false, true>::new(
///            &device,
///            NonZeroU32::new_unchecked(300),
///            NonZeroU32::new_unchecked(300),
///            String::from("diffuseTexture"),
///        ));
///      let renderable_textureview: Rc<RefCell<dyn RenderAttachmentTexture>> =
///        TextureView::<_, _, _, false, false, false, false, true>::new::<_, _, _, _, _, _, 1, 0, _, _, 0, 1>(
///            texture,
///            String::from("test"),
///            TextureViewDimension::D2,
///            TextureAspect::All,
///        );
/// }
/// ```
pub trait RenderAttachmentTexture {
    fn to_number(&self) -> u32;
    fn get_attachment(&self) -> &Resource<JSTextureView>;
    fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>);
    fn version(&self) -> Option<NonZeroU32>;
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
    for TextureView<
        F,
        DIMENSION,
        SAMPLE_COUNT,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        true,
    >
{
    fn to_number(&self) -> u32 {
        F::to_number()
    }

    fn get_attachment(&self) -> &Resource<JSTextureView> {
        &self.externref
    }

    fn resize(&self, device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        self.texture.resize(device, width, height);
    }

    fn version(&self) -> Option<NonZeroU32> {
        Some(self.version)
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
