use std::{cell::RefCell, collections::BTreeMap, num::NonZeroUsize, rc::Rc};

use externref::Resource;
use web::console::console::Console;
use webgpu::{
    buffer::{buffer::GPUBuffer, mapped_buffer::MappedGPUBuffer},
    device::JSDevice,
};

pub struct SwapBuffers {
    mapped: Rc<RefCell<BTreeMap<usize, Vec<MappedGPUBuffer<false, true, true>>>>>,
    onqueue: Vec<GPUBuffer<false, true, true>>,
}
impl SwapBuffers {
    pub fn new() -> SwapBuffers {
        SwapBuffers {
            mapped: Rc::new(RefCell::new(BTreeMap::new())),
            onqueue: Vec::with_capacity(16),
        }
    }
    /**
     * Check if there are free buffer with given size
     * TODO: Remove buffers not used for a while.
     */
    fn get_existing(&mut self, size: usize) -> Option<MappedGPUBuffer<false, true, true>> {
        let mut borrowed = self.mapped.borrow_mut();
        let (got_size, len, buffer) = {
            let (got_size, pool) = borrowed
                .range_mut(size..(size as f32 * 1.1).ceil() as usize)
                .next()?;
            let buffer = pool.pop();
            //["ask size", &size.to_string(), "got size", &got_size.to_string()].log();
            (*got_size, pool.len(), buffer)
        };
        if len == 0 {
            borrowed.remove(&got_size);
        }
        return buffer;
    }
    pub fn get<F: FnOnce(&MappedGPUBuffer<false, true, true>)>(
        &mut self,
        device: &Resource<JSDevice>,
        size: NonZeroUsize,
        cb: F,
    ) {
        let mapped_buffer = self.get_existing(size.get()).unwrap_or_else(|| {
            GPUBuffer::new_mapped(
                device,
                size,
                String::from(size.to_string() + "_swap_buffer"),
            )
        });
        cb(&mapped_buffer);
        self.onqueue.push(mapped_buffer.unmap());
    }
    pub fn queue_submited(&mut self) {
        let mut i = 0;
        while i < self.onqueue.len() {
            if Rc::strong_count(&self.onqueue[i].externref) == 1 {
                let mappadle_buffer = self.onqueue.remove(i);
                let mappedrc = self.mapped.clone();
                mappadle_buffer.map_write_async(0, None, move |buffer_opt| match buffer_opt {
                    Ok(buffer) => {
                        let mut borrowed = mappedrc.borrow_mut();
                        let mapped = borrowed.entry(buffer.size.get()).or_insert(Vec::new());
                        mapped.push(buffer);
                    }
                    Err((_, error)) => {
                        Console::error(&error);
                    }
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
    use externref::ExternRef;
    unsafe {
        let device: Resource<JSDevice> =
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(1));
        let mut swap = SwapBuffers::new();
        swap.get(&device, NonZeroUsize::new_unchecked(110), |_buffer| {});
        swap.get(&device, NonZeroUsize::new_unchecked(110), |_buffer| {});
        assert_eq!(swap.onqueue.len(), 2);
        swap.queue_submited();
        assert_eq!(swap.onqueue.len(), 0);
        {
            let borrowed = swap.mapped.borrow();
            let buffers = borrowed.get(&110usize).unwrap();
            assert_eq!(buffers.len(), 2);
        }
        swap.get(&device, NonZeroUsize::new_unchecked(105), |_buffer| {});
        let borrowed = swap.mapped.borrow();
        let buffers = borrowed.get(&110usize).unwrap();
        assert_eq!(buffers.len(), 1);
    }
}
