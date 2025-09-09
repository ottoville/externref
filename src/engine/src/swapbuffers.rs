use std::{collections::BTreeMap, sync::Arc};

use externref::Resource;
use webgpu::device::JSDevice;

use crate::{
    gpu::buffer::{buffer::GPUBuffer, mapped_buffer::MappedGPUBuffer},
    mesh::ENGINE,
};
pub struct SwapBuffers {
    mapped: BTreeMap<usize, Vec<MappedGPUBuffer<false, true, true>>>,
    onqueue: Vec<GPUBuffer<false, true, true>>,
}
impl SwapBuffers {
    pub fn new() -> SwapBuffers {
        SwapBuffers {
            mapped: BTreeMap::new(),
            onqueue: Vec::with_capacity(16),
        }
    }
    /**
     * Check if there are free buffer with given size
     * TODO: Remove buffers not used for a while.
     */
    fn get_existing(&mut self, size: usize) -> Option<MappedGPUBuffer<false, true, true>> {
        let (got_size, len, buffer) = {
            let (got_size, pool) = self
                .mapped
                .range_mut(size..(size as f32 * 1.1).ceil() as usize)
                .next()?;
            let buffer = pool.pop();
            //["ask size", &size.to_string(), "got size", &got_size.to_string()].log();
            (*got_size, pool.len(), buffer)
        };
        if len == 0 {
            self.mapped.remove(&got_size);
        }
        return buffer;
    }
    pub fn get<F: FnOnce(&MappedGPUBuffer<false, true, true>)>(
        &mut self,
        device: &Resource<JSDevice>,
        size: usize,
        cb: F,
    ) {
        let mapped_buffer = self.get_existing(size).unwrap_or_else(|| {
            GPUBuffer::new_mapped(
                device,
                size,
                String::from(size.to_string() + "_swap_buffer"),
                false,
            )
        });
        cb(&mapped_buffer);
        self.onqueue.push(mapped_buffer.unmap());
    }
    pub fn queue_submited(&mut self) {
        let mut i = 0;
        while i < self.onqueue.len() {
            if Arc::strong_count(&self.onqueue[i].externref) == 1 {
                let mappadle_buffer = self.onqueue.remove(i);
                mappadle_buffer.map_write_async(0, None, |buffer| {
                    let mut gpuotp = ENGINE.gpu.lock().unwrap();
                    let gpu = gpuotp.as_mut().unwrap();
                    let mapped = gpu
                        .swap_buffers
                        .mapped
                        .entry(buffer.size)
                        .or_insert(Vec::new());
                    //["push to mapped", &buffer.size.to_string()].log();
                    mapped.push(buffer);
                });
            } else {
                i = i + 1;
            }
        }
    }
}
#[cfg(test)]
#[test]
fn test_swap_buffers() {
    use crate::gpu::{self, gpu::init_gpu};
    use externref::ExternRef;
    unsafe {
        let device = Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
        init_gpu(
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(2)),
            false,
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(3)),
        );
        let mut swap = SwapBuffers::new();
        swap.get(&device, 110, |_buffer| {});
        swap.get(&device, 110, |_buffer| {});
        assert_eq!(swap.onqueue.len(), 2);
        swap.queue_submited();
        assert_eq!(swap.onqueue.len(), 0);
        let mut gpuopt = ENGINE.gpu.lock().unwrap();
        let gpuopt2 = gpuopt.as_mut().unwrap();
        let buffers = gpuopt2.swap_buffers.mapped.get(&110usize).unwrap();
        assert_eq!(buffers.len(), 2);
        gpuopt2.swap_buffers.get(&device, 105, |_buffer| {});
        let buffers = gpuopt2.swap_buffers.mapped.get(&110usize).unwrap();
        assert_eq!(buffers.len(), 1);
    }
}
