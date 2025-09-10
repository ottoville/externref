use externref::externref;
use externref::Resource;
use crate::canvas_context::{JSGPUCanvasContext, UnconfiguredCanvasContext};


#[cfg(not(target_arch = "wasm32"))]
pub unsafe fn get_webgpu_context(_canvas: &Resource<JSCanvas>) -> Resource<JSGPUCanvasContext> {
    use externref::ExternRef;
    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1))
}

#[cfg(target_arch = "wasm32")]
#[externref]
#[link(wasm_import_module = "canvas")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn set_width(canvas: &Resource<JSCanvas>, width: usize);
    pub fn set_height(canvas: &Resource<JSCanvas>, width: usize);
    pub fn get_webgpu_context(canvas: &Resource<JSCanvas>) -> Resource<JSGPUCanvasContext>;
}

pub struct JSCanvas(());

pub struct Canvas {
    pub externref: Resource<JSCanvas>,
}
impl Canvas {
    pub fn get_webgpu_context(&self) -> UnconfiguredCanvasContext {
        UnconfiguredCanvasContext {
            context: unsafe { get_webgpu_context(&self.externref) },
        }
    }
}
