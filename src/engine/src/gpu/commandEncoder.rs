use externref::{externref, Resource};

use crate::MULTIVALUE_USIZE;


pub struct JSCommandEncoder(());
pub struct JSCommandBuffer(());

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "commandencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    pub fn create_gpu_command_encoder(
        label: *const usize,
    ) -> Resource<JSCommandEncoder>;
    pub fn finish(
        command_encoder: &Resource<JSCommandEncoder>,
        label: *const usize,
    ) -> Resource<JSCommandBuffer>;

}

pub struct GPUCommandEncoder {
    pub externref: Resource<JSCommandEncoder>,
    label: String,
    owned_by_js: bool,
}
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
impl GPUCommandEncoder {
    pub fn new(label: String) -> GPUCommandEncoder {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();

            let externref =
            create_gpu_command_encoder(MULTIVALUE_USIZE.as_ptr());
            return GPUCommandEncoder {
                externref,
                label,
                owned_by_js: false,
            };
        }
    }
    pub fn finish(self, label: String) -> Resource<JSCommandBuffer> {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();
            finish(&self.externref, MULTIVALUE_USIZE.as_ptr())
        }
    }
}
