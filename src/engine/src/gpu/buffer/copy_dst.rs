#[cfg(target_arch = "wasm32")]
#[cfg(feature = "webgpu")]
use super::buffer::{copy_from, write};
use super::{buffer::GpuBuffer, copy_src::CopySrc};
use crate::gpu::commandEncoder::GPUCommandEncoder;
pub trait CopyDst: GpuBuffer {
    fn copy_from(
        &self,
        command_encoder: &GPUCommandEncoder,
        source: &dyn CopySrc,
        source_offset: usize,
        destination_offset: usize,
        copy_size: usize,
    ) {
        #[cfg(feature = "webgpu")]
        #[cfg(any(not(test), rust_analyzer))]
        unsafe {
            copy_from(
                &command_encoder.externref,
                &self.externref(),
                &source.externref(),
                source_offset,
                destination_offset,
                copy_size,
            )
        }
    }
    fn write(&self, ptr: usize, size: usize, buffer_offset: usize) {
        #[cfg(feature = "webgpu")]
        #[cfg(any(not(test), rust_analyzer))]
        unsafe {
            write(&self.externref(), ptr, size, buffer_offset);
        }
    }
}
