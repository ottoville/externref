use externref::Resource;

#[cfg(feature = "webgpu")]
#[cfg(any(not(test), rust_analyzer))]
use super::buffer::copy_from;
use super::buffer::{GpuBuffer, JSBuffer};
use crate::gpu::gpu::JSDevice;
use crate::{gpu::command_encoder::GPUCommandEncoder, MULTIVALUE_USIZE};

pub trait CopySrc: GpuBuffer {
    /**
     * Resizes the underlying buffer by creating new one and copies the old content to new one, then returns old buffer
     */
    #[cfg(feature = "webgpu")]
    #[cfg(any(not(test), rust_analyzer))]
    fn resize(
        &mut self,
        device: &Resource<JSDevice>,
        command_encoder: &GPUCommandEncoder,
        size: usize,
    ) -> Resource<JSBuffer> {
        use crate::gpu::gpu::create_gpu_buffer;

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
    #[cfg(test)]
    fn resize(
        &mut self,
        _device: &Resource<JSDevice>,
        _command_encoder: &GPUCommandEncoder,
        size: usize,
    ) -> Resource<JSBuffer> {
        use externref::ExternRef;
        unsafe {
            self.set_size(size);
            self.replace_externref(Resource::new_non_null(std::mem::transmute::<
                usize,
                ExternRef,
            >(0)))
        }
    }
}
