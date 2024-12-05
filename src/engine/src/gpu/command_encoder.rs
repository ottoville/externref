use externref::{externref, Resource};

use crate::MULTIVALUE_USIZE;

use super::compute_pass_encoder::{ComputePassEncoder, JSComputePassEncoder};

pub struct JSCommandEncoder(());
pub struct JSCommandBuffer(());

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
#[externref]
#[link(wasm_import_module = "commandencoder")]
#[cfg(any(not(test), rust_analyzer))]
extern "C" {
    fn create_gpu_command_encoder(label: *const usize) -> Resource<JSCommandEncoder>;
    fn finish(
        command_encoder: &Resource<JSCommandEncoder>,
        label: *const usize,
    ) -> Resource<JSCommandBuffer>;
    fn begin_compute_pass(
        command_encoder: &Resource<JSCommandEncoder>,
        label: *const usize,
    ) -> Resource<JSComputePassEncoder>;
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

            let externref = create_gpu_command_encoder(MULTIVALUE_USIZE.as_ptr());
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
    pub fn begin_compute_pass(self, label: String) -> ComputePassEncoder {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();
            let externref = begin_compute_pass(&self.externref, MULTIVALUE_USIZE.as_ptr());
            ComputePassEncoder {
                command_encoder: self,
                externref,
            }
        }
    }
    pub fn take_externref(self) -> Resource<JSCommandEncoder> {
        self.externref
    }
}
#[cfg(test)]
impl GPUCommandEncoder {
    pub fn new(label: String) -> GPUCommandEncoder {
        use externref::ExternRef;
        unsafe {
            return GPUCommandEncoder {
                externref: Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                label,
                owned_by_js: false,
            };
        }
    }
    pub fn finish(self, label: String) -> Resource<JSCommandBuffer> {
        use externref::ExternRef;
        unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)) }
    }
    pub fn begin_compute_pass(self, label: String) -> ComputePassEncoder {
        use externref::ExternRef;
        unsafe {
            ComputePassEncoder {
                command_encoder: self,
                externref: Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            }
        }
    }
}
