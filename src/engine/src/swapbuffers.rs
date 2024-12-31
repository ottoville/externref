use std::{collections::BTreeMap, sync::Arc};

use externref::Resource;

use crate::gpu::{
    buffer::{
        mappadle_buffer::MappadleGPUBuffer, mapped_buffer::MappedGPUBuffer,
        pending_buffer::PendingGPUBuffer, usages::MAP_WRITE_COPYSRC_USAGE,
    },
    gpu::JSDevice,
};

pub struct SwapBuffers {
    pending: Vec<PendingGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>,
    mapped: BTreeMap<usize, Vec<MappedGPUBuffer<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>>>,
    onqueue: Vec<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>,
}
impl SwapBuffers {
    pub fn new() -> SwapBuffers {
        SwapBuffers {
            pending: Vec::with_capacity(16),
            mapped: BTreeMap::new(),
            onqueue: Vec::with_capacity(16),
        }
    }
    /**
     * Check if there are free buffer with given size
     * TODO: Remove buffers not used for a while.
     */
    fn get_existing(
        &mut self,
        size: usize,
    ) -> Option<MappedGPUBuffer<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>> {
        let (got_size, len, buffer) = {
            let (got_size, pool) = self
                .mapped
                .range_mut(size..(size as f32 * 1.1) as usize)
                .next()?;
            let buffer = pool.pop();
            //js_log([&"ask size".to_string(), &size.to_string(), &"got size".to_string(), &got_size.to_string()]);
            (*got_size, pool.len(), buffer)
        };
        if len == 0 {
            self.mapped.remove(&got_size);
        }
        return buffer;
    }
    pub fn get<
        F: FnOnce(
            &MappedGPUBuffer<MappadleGPUBuffer<MAP_WRITE_COPYSRC_USAGE>>,
        ),
    >(
        &mut self,
        device: &Resource<JSDevice>,
        size: usize,
        cb: F,
    ) {
        let mapped_buffer = self.get_existing(size).unwrap_or_else(|| {
            //js_log([&"create buffer".to_string(), &size.to_string()]);
            MappadleGPUBuffer::new_mapped(
                device,
                size,
                String::from(size.to_string() + "_swap_buffer"),
                false,
            )
        });
        cb(&mapped_buffer);
        self.onqueue.push(mapped_buffer.unmap());
    }
    pub fn queue_submited(&mut self) -> bool {
        let mut i = 0;
        let mut some_mapping = false;
        while i < self.onqueue.len() {
            if Arc::strong_count(&self.onqueue[i].externref) == 1 {
                let mappadle_buffer = self.onqueue.remove(i);
                let pending_buffer = mappadle_buffer.map_write_async(0, None);
                self.pending.push(pending_buffer);
                some_mapping = true
            } else {
                i = i + 1;
            }
        }
        return some_mapping;
    }

    pub fn check_mapped_buffers(&mut self) -> bool {
        let mut i = 0;
        while i < self.pending.len() {
            if self.pending[i].map_state() == 2 {
                let pending_buffer = self.pending.remove(i);
                let mapped = self
                    .mapped
                    .entry(pending_buffer.size())
                    .or_insert(Vec::new());
                mapped.push(pending_buffer.into());
            } else {
                i = i + 1;
            }
        }
        return self.pending.len() > 0;
    }
}
