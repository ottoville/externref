use crate::{canvas::CanvasNoContext, device::JSDevice, texture::texture::JSTexture};
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
#[externref::externref]
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

pub trait CanvasContextTrait {}

#[test]
fn context_with_srgb_view() {
    use crate::canvas::Canvas;
    use crate::texture::texture_formats::RGBA8UNORM;

    use externref::ExternRef;
    let device = unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) };
    unsafe {
        let canvas = CanvasNoContext {
            externref: Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
        };
        let canvas_with_context = canvas.get_webgpu_context();
        canvas_with_context
            .configure_with_srgb_multiview::<RGBA8UNORM, false, false, false, false, true, _>(
                &device,
                ColorSpace::SRGB,
                None,
                AlphaMode::Opaque,
            );
    }
}
