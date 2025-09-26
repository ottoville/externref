use std::{marker::PhantomData, sync::Arc};

use externref::Resource;

use crate::{
    canvas::{Canvas, CanvasWithContext},
    context::{
        canvas_context::{
            configure, AlphaMode, CanvasContextTrait, ColorSpace, JSGPUCanvasContext, ToneMapping,
        },
        configured_webgpu_context::ConfiguredWebgpuContext,
    },
    device::JSDevice,
    texture::{
        texture::usages_from_bools,
        texture_formats::{TextureFormat, TextureFormatSRGB},
    },
};

pub struct UnconfiguredWebgpuContext {
    pub context: Resource<JSGPUCanvasContext>,
    pub canvas: Arc<dyn Canvas>,
}
impl CanvasContextTrait for UnconfiguredWebgpuContext {}

impl CanvasWithContext<UnconfiguredWebgpuContext> {
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
    ) -> CanvasWithContext<
        ConfiguredWebgpuContext<
            F,
            COPY_SRC,
            COPY_DST,
            TEXTURE_BINDING,
            STORAGE_BINDING,
            RENDER_ATTACHMENT,
        >,
    > {
        unsafe {
            configure(
                &self.context.context,
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
        let canvas = self.canvas.clone();
        return CanvasWithContext {
            canvas: self.canvas,
            context: ConfiguredWebgpuContext {
                format: PhantomData,
                context: self.context.context,
                view: None,
                label: String::from("canvas_context_texture_view"),
                canvas,
            },
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
    ) -> CanvasWithContext<
        ConfiguredWebgpuContext<
            F,
            COPY_SRC,
            COPY_DST,
            TEXTURE_BINDING,
            STORAGE_BINDING,
            RENDER_ATTACHMENT,
            true,
        >,
    >
    where
        F: TextureFormatSRGB<VF>,
    {
        let variants = [F::to_number(), F::to_srgb()];
        unsafe {
            configure(
                &self.context.context,
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
            context: ConfiguredWebgpuContext {
                format: PhantomData,
                context: self.context.context,
                view: None,
                label: String::from("canvas_context_texture_view"),
                canvas,
            },
        };
    }
}
