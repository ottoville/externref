use std::{num::NonZeroU32, sync::Arc};

use externref::Resource;

use crate::context::{
    canvas_context::{CanvasContextTrait, JSGPUCanvasContext},
    unconfigured_webgpu_context::UnconfiguredWebgpuContext,
};

#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn get_webgpu_context(_canvas: &Resource<JSCanvas>) -> Resource<JSGPUCanvasContext> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}


#[cfg(not(target_arch = "wasm32"))]
pub fn set_width(_canvas: &Resource<JSCanvas>, _width: u32) {}
#[cfg(not(target_arch = "wasm32"))]
pub fn set_height(_canvas: &Resource<JSCanvas>, _width: u32) {}


#[cfg(target_arch = "wasm32")]
#[externref::externref]
#[link(wasm_import_module = "canvas")]
extern "C" {
    pub fn set_width(canvas: &Resource<JSCanvas>, width: u32);
    pub fn set_height(canvas: &Resource<JSCanvas>, height: u32);
    pub fn get_webgpu_context(canvas: &Resource<JSCanvas>) -> Resource<JSGPUCanvasContext>;
}

pub struct JSCanvas(());

pub struct CanvasNoContext {
    pub externref: Resource<JSCanvas>,
}
pub struct CanvasWithContext<T: CanvasContextTrait> {
    pub canvas: Arc<CanvasNoContext>,
    pub context: T,
}

pub trait Canvas {
    fn resize(&self, width: NonZeroU32, height: NonZeroU32);
}

impl Canvas for CanvasNoContext {
    fn resize(&self, width: NonZeroU32, height: NonZeroU32) {
        unsafe {
            set_width(&self.externref, width.get());
            set_height(&self.externref, height.get())
        };
    }
}
impl<T: CanvasContextTrait> Canvas for CanvasWithContext<T> {
    fn resize(&self, width: NonZeroU32, height: NonZeroU32) {
        unsafe {
            set_width(&self.canvas.externref, width.get());
            set_height(&self.canvas.externref, height.get())
        };
    }
}

impl CanvasNoContext {
    pub fn get_webgpu_context(self) -> CanvasWithContext<UnconfiguredWebgpuContext> {
        let context = unsafe { get_webgpu_context(&self.externref) };
        let aself = Arc::new(self);
        let context = UnconfiguredWebgpuContext {
            context,
            canvas: aself.clone(),
        };
        CanvasWithContext::<UnconfiguredWebgpuContext> {
            context,
            canvas: aself,
        }
    }
}
