use std::{
    cell::{Cell, RefCell},
    marker::PhantomData,
    num::NonZero,
    rc::Rc,
    sync::Arc,
};

use externref::Resource;

use crate::{
    canvas::{Canvas, CanvasWithContext},
    context::{
        canvas_context::{
            configure, get_current_texture, AlphaMode, CanvasContextTrait, ColorSpace,
            JSGPUCanvasContext, ToneMapping,
        },
        unconfigured_webgpu_context::UnconfiguredWebgpuContext,
    },
    device::JSDevice,
    texture::{
        render_attachment_texture::{
            RenderAttachmentTexture, RenderAttachmentTextureSingleSampled,
        },
        texture::{usages_from_bools, TextureAspect, TextureViewDimension},
        texture_formats::{TextureFormat, TextureFormatSRGB},
        texture_view::{create_texture_view, JSTextureView},
    },
};
thread_local! {
    static VIEW: Cell<Option<Resource<JSTextureView>>> = const { Cell::new(None) };
}
pub struct ConfiguredWebgpuContext<
    F: TextureFormat,
    const COPY_SRC: bool,
    const COPY_DST: bool,
    const TEXTURE_BINDING: bool,
    const STORAGE_BINDING: bool,
    const RENDER_ATTACHMENT: bool,
    const SRGB_MULTIVIEW: bool = false,
> {
    pub format: PhantomData<F>,
    pub context: Resource<JSGPUCanvasContext>,
    pub label: String,
    pub canvas: Arc<dyn Canvas + Sync + Send>,
}
impl<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    > CanvasContextTrait
    for ConfiguredWebgpuContext<
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
impl<
        F: TextureFormat,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    >
    CanvasWithContext<
        ConfiguredWebgpuContext<
            F,
            COPY_SRC,
            COPY_DST,
            TEXTURE_BINDING,
            STORAGE_BINDING,
            RENDER_ATTACHMENT,
            SRGB_MULTIVIEW,
        >,
    >
{
    pub fn unconfigure(self) -> CanvasWithContext<UnconfiguredWebgpuContext> {
        let canvas = self.canvas.clone();
        return CanvasWithContext {
            canvas: self.canvas,
            context: Rc::new(RefCell::new(UnconfiguredWebgpuContext {
                canvas,
                context: Rc::into_inner(self.context).unwrap().into_inner().context,
            })),
        };
    }
    pub fn reconfigure<
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
    ) -> CanvasWithContext<
        ConfiguredWebgpuContext<
            NF,
            COPY_SRC2,
            COPY_DST2,
            TEXTURE_BINDING2,
            STORAGE_BINDING2,
            RENDER_ATTACHMENT2,
        >,
    > {
        unsafe {
            configure(
                &self.context.borrow().context,
                device,
                NF::to_number(),
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
        let canvas = self.canvas.clone();

        return CanvasWithContext {
            canvas: self.canvas,
            context: Rc::new(RefCell::new(ConfiguredWebgpuContext {
                format: PhantomData,
                context: Rc::into_inner(self.context).unwrap().into_inner().context,
                label: String::from("canvas_context_texture_view"),
                canvas,
            })),
        };
    }
    pub fn reconfigure_with_srgb_multiview<
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
    ) -> CanvasWithContext<
        ConfiguredWebgpuContext<
            NF,
            COPY_SRC2,
            COPY_DST2,
            TEXTURE_BINDING2,
            STORAGE_BINDING2,
            RENDER_ATTACHMENT2,
            true,
        >,
    >
    where
        NF: TextureFormatSRGB<VF>,
    {
        let variants = [NF::to_number(), NF::to_srgb()];
        unsafe {
            configure(
                &self.context.borrow().context,
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
        let canvas = self.canvas.clone();

        return CanvasWithContext {
            canvas: self.canvas,
            context: Rc::new(RefCell::new(ConfiguredWebgpuContext {
                format: PhantomData,
                context: Rc::into_inner(self.context).unwrap().into_inner().context,
                label: String::from("canvas_context_texture_view"),
                canvas,
            })),
        };
    }
}
impl<
        F: TextureFormat + Sync + Send + 'static,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    > RenderAttachmentTexture
    for ConfiguredWebgpuContext<
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
        let texture = unsafe { get_current_texture(&self.context) };

        let view: Resource<JSTextureView> = unsafe {
            create_texture_view(
                &texture,
                self.label.as_ptr() as usize,
                self.label.len(),
                F::to_number(),
                TextureViewDimension::D2,
                usages_from_bools::<
                    COPY_SRC,
                    COPY_DST,
                    TEXTURE_BINDING,
                    STORAGE_BINDING,
                    RENDER_ATTACHMENT,
                >(),
                TextureAspect::All,
                0,
                1,
                0,
                1,
            )
        };
        let p = VIEW.with(|v: &Cell<Option<Resource<JSTextureView>>>| unsafe {
            v.set(Some(view));
            v.as_ptr().as_ref().unwrap().as_ref().unwrap()
        });
        return p;
    }

    fn resize(&self, _device: &Resource<JSDevice>, width: NonZero<u32>, height: NonZero<u32>) {
        self.canvas.resize(width, height);
    }

    fn is_dirty(&self) -> bool {
        return true;
    }
    fn label(&self) -> &String {
        &self.label
    }
}
impl<
        F: TextureFormat + Sync + Send + 'static,
        const COPY_SRC: bool,
        const COPY_DST: bool,
        const TEXTURE_BINDING: bool,
        const STORAGE_BINDING: bool,
        const RENDER_ATTACHMENT: bool,
        const SRGB_MULTIVIEW: bool,
    > RenderAttachmentTextureSingleSampled
    for ConfiguredWebgpuContext<
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
