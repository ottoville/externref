use externref::Resource;
use crate::engine::GPUCommandEncoder;
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
use super::{buffer::{copy_from, GpuBuffer, write}, copy_src::CopySrc};
#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
pub trait CopyDst: GpuBuffer {
    fn copy_from(
        &self,
        command_encoder: &Resource<GPUCommandEncoder>,
        source: &dyn CopySrc,
        source_offset: usize,
        destination_offset: usize,
        copy_size: usize,
    ) {
        unsafe {
            copy_from(
                command_encoder,
                &self.externref(),
                &source.externref(),
                source_offset,
                destination_offset,
                copy_size,
            )
        }
    }
    fn write(&self, ptr: usize, size: usize, buffer_offset: usize) {
        unsafe {
            write(&self.externref(), ptr, size, buffer_offset);
        }
    }
}