use std::cell::RefCell;
use std::sync::Arc;

use externref::Resource;

use crate::gpu::buffer::buffer::GPUBuffer;
use crate::gpu::command_encoder::GPUCommandEncoder;
use crate::gpu::gpu::JSDevice;
use crate::gpu::{command_encoder::copy_buffer_to_buffer, gpu::create_gpu_buffer};
thread_local! {
    static LABEL:RefCell<[usize; 3]> = const { RefCell::new([0;3]) };
}
impl<
        const MAP_READ: bool,
        const MAP_WRITE: bool,
        const COPY_DST: bool,
        const INDEX: bool,
        const VERTEX: bool,
        const UNIFORM: bool,
        const STORAGE: bool,
        const INDIRECT: bool,
        const QUERY_RESOLVE: bool,
    >
    GPUBuffer<
        MAP_READ,
        MAP_WRITE,
        true,
        COPY_DST,
        INDEX,
        VERTEX,
        UNIFORM,
        STORAGE,
        INDIRECT,
        QUERY_RESOLVE,
    >
{
    /**
     * Resizes the underlying buffer by creating new one and copies the old content to new one
     */
    pub fn resize(
        &mut self,
        device: &Resource<JSDevice>,
        command_encoder: &mut GPUCommandEncoder,
        size: usize,
    ) {
        let label_ptr = LABEL.with_borrow_mut(|l| {
            l[0] = self.label.as_ptr() as usize;
            l[1] = self.label.len();
            l[2] = self.label.capacity();
            l.as_ptr()
        });
        unsafe {
            let new_externref = create_gpu_buffer(
                device,
                size,
                label_ptr,
                Self::usages(),
                false,
                self.owned_by_js,
            );
            copy_buffer_to_buffer(
                &command_encoder.externref,
                &self.externref,
                &new_externref,
                0,
                0,
                self.size,
            );
            self.size = size;
            command_encoder
                .buffers
                .push(self.replace_externref(Arc::new(new_externref)));
        }
    }
}
