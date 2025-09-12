use std::marker::PhantomData;

use crate::{
    device::JSDevice,
    texture::{
        render_attachment_texture::{
            RenderAttachmentTexture, RenderAttachmentTextureSingleSampled,
        },
        texture::{usages_from_bools, JSTexture, Texture, TextureAspect, TextureViewDimension},
        texture_formats::{TextureFormat, TextureFormatSRGB},
        texture_view::{JSTextureView, TextureView},
    },
};
use externref::externref;
use externref::Resource;

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn get_current_texture(_context: &Resource<JSGPUCanvasContext>) -> Resource<JSTexture> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn configure(
    _context: &Resource<JSGPUCanvasContext>,
    _device: &Resource<JSDevice>,
    _format: u32,
    _usage: u32,
    _viewformats_ptr: usize,
    _viewformats_len: usize,
    _color_space: ColorSpace,
    _tone_mapping: i32,
    _alpha_mode: AlphaMode,
) {
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "webgpucontext")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn get_current_texture(context: &Resource<JSGPUCanvasContext>) -> Resource<JSTexture>;
    pub fn configure(
        context: &Resource<JSGPUCanvasContext>,
        device: &Resource<JSDevice>,
        format: u32,
        usage: u32,
        viewformats_ptr: usize,
        viewformats_len: usize,
        color_space: ColorSpace,
        tone_mapping: i32,
        alpha_mode: AlphaMode,
    );
}

pub enum ColorSpace {
    DisplayP3,
    SRGB,
}
pub enum AlphaMode {
    Opaque,
    Premultiplied,
}
pub enum ToneMapping {
    Standard,
    Extended,
}
pub struct JSGPUCanvasContext(());

pub struct UnconfiguredCanvasContext {
    pub context: Resource<JSGPUCanvasContext>,
}
impl UnconfiguredCanvasContext {
    pub fn configure<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
    >(
        self,
        device: &Resource<JSDevice>,
        color_space: ColorSpace,
        tone_mapping: Option<ToneMapping>,
        alpha_mode: AlphaMode,
    ) -> CanvasContext<F, COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, RENDER_ATTACHMENT>
    {
        unsafe {
            configure(
                &self.context,
                device,
                F::to_number(),
                usages_from_bools::<
                    COPY_SRC,
                    COPY_DST,
                    TEXTURE_BINDING,
                    STORAGE_BINDING,
                    RENDER_ATTACHMENT,
                >(),
                0,
                0,
                color_space,
                match tone_mapping {
                    Some(t) => t as i32,
                    None => -1,
                },
                alpha_mode,
            )
        };
        return CanvasContext {
            format: PhantomData,
            context: self.context,
            view: None,
        };
    }
    pub fn configure_with_srgb_multiview<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        VF: TextureFormat,
    >(
        self,
        device: &Resource<JSDevice>,
        color_space: ColorSpace,
        tone_mapping: Option<ToneMapping>,
        alpha_mode: AlphaMode,
    ) -> CanvasContext<
        F,
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
        unsafe {
            configure(
                &self.context,
                device,
                F::to_number(),
                usages_from_bools::<
                    COPY_SRC,
                    COPY_DST,
                    TEXTURE_BINDING,
                    STORAGE_BINDING,
                    RENDER_ATTACHMENT,
                >(),
                variants.as_ptr() as usize,
                variants.len(),
                color_space,
                match tone_mapping {
                    Some(t) => t as i32,
                    None => -1,
                },
                alpha_mode,
            )
        };
        return CanvasContext {
            format: PhantomData,
            context: self.context,
            view: None,
        };
    }
}

pub struct CanvasContext<
    F: TextureFormat,
    const COPY_SRC: bool,
    const COPY_DST: bool,
    const TEXTURE_BINDING: bool,
    const STORAGE_BINDING: bool,
    const RENDER_ATTACHMENT: bool,
    const SRGB_MULTIVIEW: bool = false,
> {
    pub format: PhantomData<F>,
    context: Resource<JSGPUCanvasContext>,
    view: Option<
        TextureView<
            F,
            2,
            1,
            COPY_SRC,
            COPY_DST,
            TEXTURE_BINDING,
            STORAGE_BINDING,
            RENDER_ATTACHMENT,
        >,
    >,
}

impl<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    >
    CanvasContext<
        F,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
{
    pub fn unconfigure(self) -> UnconfiguredCanvasContext {
        return UnconfiguredCanvasContext {
            context: self.context,
        };
    }
    pub fn configure<
        NF: TextureFormat,
        const COPY_SRC2: bool,
        const COPY_DST2: bool,
        const TEXTURE_BINDING2: bool,
        const STORAGE_BINDING2: bool,
        const RENDER_ATTACHMENT2: bool,
    >(
        self,
        device: &Resource<JSDevice>,
        color_space: ColorSpace,
        tone_mapping: Option<ToneMapping>,
        alpha_mode: AlphaMode,
    ) -> CanvasContext<
        NF,
        COPY_SRC2,
        COPY_DST2,
        TEXTURE_BINDING2,
        STORAGE_BINDING2,
        RENDER_ATTACHMENT2,
    > {
        return (UnconfiguredCanvasContext {
            context: self.context,
        })
        .configure(device, color_space, tone_mapping, alpha_mode);
    }
    pub fn configure_with_srgb_multiview<
        NF: TextureFormat,
        const COPY_SRC2: bool,
        const COPY_DST2: bool,
        const TEXTURE_BINDING2: bool,
        const STORAGE_BINDING2: bool,
        const RENDER_ATTACHMENT2: bool,
        VF: TextureFormat,
    >(
        self,
        device: &Resource<JSDevice>,
        color_space: ColorSpace,
        tone_mapping: Option<ToneMapping>,
        alpha_mode: AlphaMode,
    ) -> CanvasContext<
        NF,
        COPY_SRC2,
        COPY_DST2,
        TEXTURE_BINDING2,
        STORAGE_BINDING2,
        RENDER_ATTACHMENT2,
        true,
    >
    where
        NF: TextureFormatSRGB<VF>,
    {
        return (UnconfiguredCanvasContext {
            context: self.context,
        })
        .configure_with_srgb_multiview(device, color_space, tone_mapping, alpha_mode);
    }
    pub fn get_current_texture(
        &self,
    ) -> Texture<
        F,
        2,
        1,
        1,
        1,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
    > {
        let texture = Texture {
            externref: unsafe { get_current_texture(&self.context) },
            label: None,
            format: PhantomData,
        };
        return texture;
    }
}
impl<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    > RenderAttachmentTexture
    for CanvasContext<
        F,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
{
    fn to_number(&self) -> u32 {
        F::to_number()
    }

    fn get_attachment(&mut self) -> &Resource<JSTextureView> {
        let texture = self.get_current_texture();
        let view = self
            .view
            .insert(texture.create_view::<COPY_SRC, COPY_DST, TEXTURE_BINDING, STORAGE_BINDING, RENDER_ATTACHMENT, 1, 0, 1, 0>(
                String::from("TODO: REMOVE THIS ALLOCATION"),
                TextureViewDimension::d2,
                TextureAspect::all,
            ));
        return &view.externref;
    }
}
impl<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    > RenderAttachmentTextureSingleSampled
    for CanvasContext<
        F,
        COPY_SRC,
        COPY_DST,
        TEXTURE_BINDING,
        STORAGE_BINDING,
        RENDER_ATTACHMENT,
        SRGB_MULTIVIEW,
    >
{
}

#[test]
fn context_with_srgb_view() {
    use crate::canvas::Canvas;
    use crate::texture::texture_formats::RGBA8UNORM;

    use externref::ExternRef;
    let device = unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) };
    unsafe {
        let canvas = Canvas {
            externref: Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
        };
        let unconfigured_context = canvas.get_webgpu_context();
        let context = unconfigured_context
            .configure_with_srgb_multiview::<RGBA8UNORM, false, false, false, false, true, _>(
                &device,
                ColorSpace::SRGB,
                None,
                AlphaMode::Opaque,
            );
    }
}
