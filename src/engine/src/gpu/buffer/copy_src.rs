use std::sync::Arc;

use externref::Resource;

use super::buffer::GpuBuffer;
use crate::gpu::gpu::JSDevice;
use crate::gpu::{command_encoder::copy_buffer_to_buffer, gpu::create_gpu_buffer};
use crate::{gpu::command_encoder::GPUCommandEncoder, MULTIVALUE_USIZE};

pub trait CopySrc: GpuBuffer {
    /**
     * Resizes the underlying buffer by creating new one and copies the old content to new one
     */
    fn resize(
        &mut self,
        device: &Resource<JSDevice>,
        command_encoder: &mut GPUCommandEncoder,
        size: usize,
    ) {
        unsafe {
            MULTIVALUE_USIZE[0] = self.label().as_ptr() as usize;
            MULTIVALUE_USIZE[1] = self.label().len();
            MULTIVALUE_USIZE[2] = self.label().capacity();

            let new_externref = create_gpu_buffer(
                device,
                size,
                MULTIVALUE_USIZE.as_ptr(),
                self.usages(),
                false,
                self.owned_by_js(),
            );
            copy_buffer_to_buffer(
                &command_encoder.externref,
                &self.externref(),
                &new_externref,
                0,
                0,
                self.size(),
            );
            self.set_size(size);
            command_encoder
                .buffers
                .push(self.replace_externref(Arc::new(new_externref)));
        }
    }
}
