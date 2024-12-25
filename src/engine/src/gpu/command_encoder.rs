use std::sync::Arc;

use externref::{externref, Resource};

use crate::MULTIVALUE_USIZE;

use super::{
    buffer::{buffer::JSBuffer, copy_dst::CopyDst, copy_src::CopySrc},
    command_buffer::{CommandBuffer, JSCommandBuffer},
    compute_pass_encoder::{ComputePassEncoder, JSComputePassEncoder},
};

pub struct JSCommandEncoder(());

#[cfg(test)]
unsafe fn create_gpu_command_encoder(_label: *const usize) -> Resource<JSCommandEncoder> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(test)]
pub unsafe fn copy_buffer_to_buffer(
    _command_encoder: &Resource<JSCommandEncoder>,
    _source: &Resource<JSBuffer>,
    _destination: &Resource<JSBuffer>,
    _source_offset: usize,
    _destination_offset: usize,
    _copy_size: usize,
) {
}
#[cfg(test)]
unsafe fn begin_compute_pass(
    _command_encoder: &Resource<JSCommandEncoder>,
    _label: *const usize,
) -> Resource<JSComputePassEncoder> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}
#[cfg(test)]
fn finish(
    _command_encoder: &Resource<JSCommandEncoder>,
    _label: *const usize,
) -> Resource<JSCommandBuffer> {
    use externref::ExternRef;
    unsafe { Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)) }
}

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
    pub fn copy_buffer_to_buffer(
        command_encoder: &Resource<JSCommandEncoder>,
        source: &Resource<JSBuffer>,
        destination: &Resource<JSBuffer>,
        sourceOffset: usize,
        destinationOffset: usize,
        copySize: usize,
    );
}

pub struct GPUCommandEncoder {
    pub externref: Resource<JSCommandEncoder>,
    // Hold references to prevent buffer being CG't before command encoder has been executed
    pub buffers: Vec<Arc<Resource<JSBuffer>>>,
    label: String,
    owned_by_js: bool,
}
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
                buffers: Vec::new(),
            };
        }
    }
    pub fn finish(self, label: String) -> CommandBuffer {
        unsafe {
            MULTIVALUE_USIZE[0] = label.as_ptr() as usize;
            MULTIVALUE_USIZE[1] = label.len();
            MULTIVALUE_USIZE[2] = label.capacity();
            CommandBuffer {
                buffers: self.buffers,
                externref: finish(&self.externref, MULTIVALUE_USIZE.as_ptr()),
            }
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
    pub fn copy_buffer_to_buffer(
        &mut self,
        source: &dyn CopySrc,
        destination: &dyn CopyDst,
        source_offset: usize,
        destination_offset: usize,
        copy_size: usize,
    ) {
        self.buffers.push(source.externref_arc());
        self.buffers.push(destination.externref_arc());
        unsafe {
            copy_buffer_to_buffer(
                &self.externref,
                source.externref(),
                destination.externref(),
                source_offset,
                destination_offset,
                copy_size,
            )
        }
    }
}
