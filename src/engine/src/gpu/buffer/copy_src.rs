use externref::Resource;

#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
use super::buffer::{copy_from, create_gpu_buffer};
use super::buffer::{GpuBuffer, JSBuffer};
use crate::{gpu::commandEncoder::GPUCommandEncoder, MULTIVALUE_USIZE};
pub trait CopySrc: GpuBuffer {
    /**
     * Resizes the underlying buffer by creating new one and copies the old content to new one, then returns old buffer
     */
    #[cfg(feature = "webgpu")]
    #[cfg(any(not(test), rust_analyzer))]
    fn resize(&mut self, command_encoder: &GPUCommandEncoder, size: usize) -> Resource<JSBuffer> {
        unsafe {
            MULTIVALUE_USIZE[0] = self.label().as_ptr() as usize;
            MULTIVALUE_USIZE[1] = self.label().len();
            MULTIVALUE_USIZE[2] = self.label().capacity();

            let new_externref = create_gpu_buffer(
                size,
                MULTIVALUE_USIZE.as_ptr(),
                self.usages(),
                false,
                self.owned_by_js(),
            );
            copy_from(
                &command_encoder.externref,
                &new_externref,
                &self.externref(),
                0,
                0,
                self.size(),
            );
            self.set_size(size);
            self.replace_externref(new_externref)
        }
    }
}
